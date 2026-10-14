"""
Flask backend for Battery SOH Prediction application.
Serves the trained SVR pipeline model via REST API.
"""

import os
import numpy as np
import pandas as pd
import joblib
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── Load Model ───────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../saved_models/final_battery_soh_model.pkl"
)

model = None

def load_model():
    global model
    try:
        model = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded from: {os.path.abspath(MODEL_PATH)}")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        model = None

# Load at import time so the model is available whether Flask is started
# via `python app.py`, `flask run`, `gunicorn`, or `vercel dev`.
load_model()

# ─── Feature ranges from training data ────────────────────────────────────────
FEATURE_RANGES = {
    "cycle":       {"min": 1,     "max": 168,   "mean": 55.39,  "unit": ""},
    "voltage":     {"min": 2.53,  "max": 3.75,  "mean": 3.42,   "unit": "V"},
    "temperature": {"min": 7.68,  "max": 54.99, "mean": 26.59,  "unit": "°C"},
}

MODEL_METRICS = {
    "name": "Support Vector Regression (SVR)",
    "kernel": "RBF",
    "C": 10,
    "epsilon": 0.01,
    "preprocessing": "StandardScaler",
    "mae":  0.0203,
    "rmse": 0.0258,
    "r2":   0.9314,
    "training_records": 1062,
    "test_records":     353,
    "batteries_total":  34,
    "features": ["cycle", "voltage", "temperature"],
    "target": "soh",
}


def soh_to_health_status(soh: float) -> dict:
    """Convert SOH value to human-readable health status."""
    pct = round(soh * 100, 2)
    if soh >= 0.90:
        return {"label": "Excellent", "color": "#00ff88", "level": 4, "pct": pct}
    elif soh >= 0.75:
        return {"label": "Good", "color": "#88ff00", "level": 3, "pct": pct}
    elif soh >= 0.60:
        return {"label": "Fair", "color": "#ffaa00", "level": 2, "pct": pct}
    else:
        return {"label": "Critical", "color": "#ff3366", "level": 1, "pct": pct}


def validate_features(cycle, voltage, temperature) -> list:
    """Return list of validation warnings (not hard errors)."""
    warnings = []
    r = FEATURE_RANGES
    if not (r["cycle"]["min"] <= cycle <= r["cycle"]["max"]):
        warnings.append(f"Cycle {cycle} is outside training range [{r['cycle']['min']}, {r['cycle']['max']}]")
    if not (r["voltage"]["min"] <= voltage <= r["voltage"]["max"]):
        warnings.append(f"Voltage {voltage}V is outside training range [{r['voltage']['min']}, {r['voltage']['max']}]")
    if not (r["temperature"]["min"] <= temperature <= r["temperature"]["max"]):
        warnings.append(f"Temperature {temperature}°C is outside training range [{r['temperature']['min']}, {r['temperature']['max']}]")
    return warnings


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": os.path.abspath(MODEL_PATH),
    })


@app.route("/api/model_info", methods=["GET"])
def model_info():
    return jsonify({
        "metrics": MODEL_METRICS,
        "feature_ranges": FEATURE_RANGES,
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    try:
        cycle       = float(data["cycle"])
        voltage     = float(data["voltage"])
        temperature = float(data["temperature"])
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid input: {e}"}), 400

    warnings = validate_features(cycle, voltage, temperature)

    features_df = pd.DataFrame([{
        "cycle":       cycle,
        "voltage":     voltage,
        "temperature": temperature,
    }])

    soh = float(model.predict(features_df)[0])
    health = soh_to_health_status(soh)

    return jsonify({
        "soh":          round(soh, 6),
        "soh_pct":      round(soh * 100, 4),
        "health_status": health,
        "warnings":     warnings,
        "inputs": {
            "cycle":       cycle,
            "voltage":     voltage,
            "temperature": temperature,
        },
    })


@app.route("/api/batch_predict", methods=["POST"])
def batch_predict():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json()
    if not data or "rows" not in data:
        return jsonify({"error": "Expected JSON with 'rows' array"}), 400

    rows = data["rows"]
    if not isinstance(rows, list) or len(rows) == 0:
        return jsonify({"error": "'rows' must be a non-empty array"}), 400

    try:
        df = pd.DataFrame(rows)[["cycle", "voltage", "temperature"]].astype(float)
    except Exception as e:
        return jsonify({"error": f"Invalid row data: {e}"}), 400

    predictions = model.predict(df).tolist()
    results = []
    for i, (_, row) in enumerate(df.iterrows()):
        soh = predictions[i]
        results.append({
            "index":       i,
            "cycle":       row["cycle"],
            "voltage":     row["voltage"],
            "temperature": row["temperature"],
            "soh":         round(soh, 6),
            "soh_pct":     round(soh * 100, 4),
            "health_status": soh_to_health_status(soh),
        })

    return jsonify({
        "count":   len(results),
        "results": results,
        "summary": {
            "mean_soh":   round(float(np.mean(predictions)), 6),
            "min_soh":    round(float(np.min(predictions)),  6),
            "max_soh":    round(float(np.max(predictions)),  6),
        }
    })


@app.route("/api/simulate", methods=["POST"])
def simulate():
    """Simulate SOH degradation across cycle range with fixed voltage and temperature."""
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body"}), 400

    try:
        voltage     = float(data.get("voltage",     3.42))
        temperature = float(data.get("temperature", 26.59))
        cycle_start = int(data.get("cycle_start",   1))
        cycle_end   = int(data.get("cycle_end",     168))
        steps       = int(data.get("steps",         80))
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid input: {e}"}), 400

    cycles = np.linspace(cycle_start, cycle_end, steps).tolist()
    df = pd.DataFrame({
        "cycle":       cycles,
        "voltage":     [voltage] * steps,
        "temperature": [temperature] * steps,
    })

    predictions = model.predict(df).tolist()

    curve = [
        {
            "cycle": round(cycles[i], 2),
            "soh":   round(predictions[i], 6),
            "soh_pct": round(predictions[i] * 100, 4),
        }
        for i in range(steps)
    ]

    return jsonify({
        "voltage":     voltage,
        "temperature": temperature,
        "curve":       curve,
        "start_soh":   round(predictions[0],  6),
        "end_soh":     round(predictions[-1], 6),
        "total_degradation": round((predictions[0] - predictions[-1]) * 100, 4),
    })


# ─── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Model is already loaded at module level above; just start the dev server.
    app.run(debug=True, port=5001, host="0.0.0.0")
