/* SinglePredict.jsx — Live single prediction with sliders */
import { useState, useEffect, useCallback, useRef } from 'react';
import GaugeChart from './GaugeChart';

const API = 'http://localhost:5001/api';

const FEATURES = [
  { key: 'cycle',       label: 'Cycle Number',  unit: '',    min: 1,    max: 168,   step: 1,    decimals: 0, default: 50  },
  { key: 'voltage',     label: 'Voltage',        unit: 'V',   min: 2.53, max: 3.75,  step: 0.01, decimals: 2, default: 3.42 },
  { key: 'temperature', label: 'Temperature',    unit: '°C',  min: 7.68, max: 54.99, step: 0.1,  decimals: 1, default: 26.6 },
];

function HealthBar({ sohPct }) {
  const color =
    sohPct >= 90 ? '#00ff88' :
    sohPct >= 75 ? '#88ff00' :
    sohPct >= 60 ? '#ffaa00' : '#ff3366';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--clr-text-2)', marginBottom: 6 }}>
        <span>Health Threshold</span>
        <span style={{ fontFamily: 'var(--font-mono)', color }}>
          {sohPct >= 90 ? 'Excellent ≥ 90%' : sohPct >= 75 ? 'Good ≥ 75%' : sohPct >= 60 ? 'Fair ≥ 60%' : 'Critical < 60%'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[
          { pct: 60, label: 'Critical', color: '#ff3366' },
          { pct: 75, label: 'Fair', color: '#ffaa00' },
          { pct: 90, label: 'Good', color: '#88ff00' },
          { pct: 100, label: 'Excellent', color: '#00ff88' },
        ].map((zone) => (
          <div
            key={zone.label}
            title={`${zone.label}: up to ${zone.pct}%`}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: sohPct >= zone.pct - 15 ? zone.color : 'rgba(255,255,255,0.08)',
              transition: 'background 0.4s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function SinglePredict() {
  const [values, setValues] = useState({
    cycle: 50,
    voltage: 3.42,
    temperature: 26.6,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);

  const predict = useCallback(async (vals) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vals),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced auto-predict on slider move
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => predict(values), 250);
    return () => clearTimeout(debounceTimer.current);
  }, [values, predict]);

  const handleSlider = (key, val, decimals) => {
    setValues((v) => ({ ...v, [key]: parseFloat(parseFloat(val).toFixed(decimals)) }));
  };

  const sohPct = result ? result.soh_pct : 0;
  const healthLabel = result ? result.health_status.label : '—';
  const healthColor = result ? result.health_status.color : '#888';

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">⚡ Live SOH Prediction</h2>
        <p className="section-subtitle">
          Adjust the sliders to predict battery State of Health in real time
        </p>
      </div>

      <div className="grid-2" style={{ gap: 28 }}>
        {/* LEFT: Sliders */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--clr-border)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Input Parameters
            </div>
          </div>

          {FEATURES.map((feat) => (
            <div className="input-group" key={feat.key}>
              <label className="input-label">
                <span>{feat.label}</span>
                <span className="input-value">
                  {values[feat.key].toFixed(feat.decimals)}{feat.unit}
                </span>
              </label>
              <div className="slider-track">
                <input
                  id={`slider-${feat.key}`}
                  type="range"
                  className="slider"
                  min={feat.min}
                  max={feat.max}
                  step={feat.step}
                  value={values[feat.key]}
                  onChange={(e) => handleSlider(feat.key, e.target.value, feat.decimals)}
                  style={{
                    background: `linear-gradient(to right, var(--clr-primary) 0%, var(--clr-primary) ${
                      ((values[feat.key] - feat.min) / (feat.max - feat.min)) * 100
                    }%, rgba(255,255,255,0.1) ${
                      ((values[feat.key] - feat.min) / (feat.max - feat.min)) * 100
                    }%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
                <div className="slider-range">
                  <span>{feat.min}{feat.unit}</span>
                  <span>{feat.max}{feat.unit}</span>
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--clr-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-2)', marginBottom: 8 }}>
              ⚡ Predictions update automatically as you adjust sliders
            </div>
            <div className="info-banner">
              Ranges based on NASA Battery Aging Dataset (34 batteries, 1,415 cycles)
            </div>
          </div>
        </div>

        {/* RIGHT: Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Gauge */}
          <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {error ? (
              <div style={{ color: 'var(--clr-critical)', textAlign: 'center', padding: 20, fontSize: '0.88rem' }}>
                ⚠ {error}
              </div>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <GaugeChart sohPct={sohPct} healthLabel={healthLabel} />
                  {loading && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(8,12,20,0.5)',
                      borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <div className="spinner" style={{ borderTopColor: 'var(--clr-primary)', border: '2px solid rgba(0,255,136,0.2)' }} />
                    </div>
                  )}
                </div>

                {result && (
                  <div style={{ width: '100%' }}>
                    <HealthBar sohPct={sohPct} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail cards */}
          {result && (
            <div className="grid-3" style={{ gap: 14 }}>
              {[
                { label: 'SOH Value', value: result.soh.toFixed(4), unit: '' },
                { label: 'SOH %', value: result.soh_pct.toFixed(2), unit: '%' },
                { label: 'Status', value: result.health_status.label, unit: '', color: healthColor },
              ].map((m) => (
                <div key={m.label} className="metric-card" style={{ padding: '14px 18px' }}>
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value" style={{ fontSize: '1.3rem', color: m.color || 'var(--clr-primary)' }}>
                    {m.value}{m.unit}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {result && result.warnings && result.warnings.length > 0 && (
            <div className="warning-banner">
              <span>⚠</span>
              <div>
                {result.warnings.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
