/* BatchPredict.jsx — CSV upload and multi-row batch prediction */
import { useState, useRef } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const API = 'http://localhost:5001/api';

const SAMPLE_CSV = `cycle,voltage,temperature
10,3.70,25.0
30,3.55,28.0
50,3.42,30.0
80,3.35,33.0
100,3.28,35.0
120,3.20,38.0
150,3.10,40.0`;

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const required = ['cycle', 'voltage', 'temperature'];
  for (const r of required) {
    if (!headers.includes(r)) throw new Error(`Missing column: "${r}"`);
  }
  return lines.slice(1).map((line, i) => {
    const vals = line.split(',').map((v) => v.trim());
    const row = {};
    headers.forEach((h, j) => { row[h] = parseFloat(vals[j]); });
    if (required.some((k) => isNaN(row[k]))) throw new Error(`Row ${i + 2} has non-numeric values`);
    return row;
  });
}

function healthColor(sohPct) {
  if (sohPct >= 90) return '#00ff88';
  if (sohPct >= 75) return '#88ff00';
  if (sohPct >= 60) return '#ffaa00';
  return '#ff3366';
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">Cycle {d.cycle}</div>
      <div className="tooltip-value" style={{ color: healthColor(d.soh_pct) }}>SOH: {d.soh_pct.toFixed(2)}%</div>
    </div>
  );
};

export default function BatchPredict() {
  const [csvText,  setCsvText]  = useState('');
  const [rows,     setRows]     = useState(null);
  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvText(text);
      try {
        const parsed = parseCSV(text);
        setRows(parsed);
        setError(null);
        setResults(null);
      } catch (err) {
        setError(err.message);
        setRows(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setCsvText(text);
    try {
      const parsed = parseCSV(text);
      setRows(parsed);
      setError(null);
      setResults(null);
    } catch {
      setRows(null);
    }
  };

  const loadSample = () => {
    setCsvText(SAMPLE_CSV);
    const parsed = parseCSV(SAMPLE_CSV);
    setRows(parsed);
    setResults(null);
    setError(null);
  };

  const runBatch = async () => {
    if (!rows || rows.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/batch_predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📋 Batch Prediction</h2>
        <p className="section-subtitle">
          Upload a CSV file or paste data to predict SOH for multiple battery measurements at once
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Input Area */}
        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
          {/* Drop zone */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                id="file-drop-zone"
              >
                <div className="upload-icon">📂</div>
                <div className="upload-text">
                  <strong>Click to upload</strong> or drag &amp; drop a CSV file<br />
                  <span style={{ fontSize: '0.8rem' }}>Required columns: <code style={{ color: 'var(--clr-primary)' }}>cycle, voltage, temperature</code></span>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
              />
            </div>

            <button
              className="btn-secondary"
              style={{ width: '100%', marginBottom: 16 }}
              onClick={loadSample}
              id="load-sample-btn"
            >
              📝 Load Sample Data
            </button>

            <textarea
              id="csv-textarea"
              value={csvText}
              onChange={handleTextChange}
              placeholder="Or paste CSV data here…"
              style={{
                width: '100%',
                height: 160,
                background: 'var(--clr-surface-2)',
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--clr-text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                padding: '12px',
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.6,
              }}
            />

            {rows && (
              <div className="info-banner" style={{ marginTop: 12 }}>
                ✅ {rows.length} row{rows.length !== 1 ? 's' : ''} parsed and ready
              </div>
            )}
            {error && (
              <div className="warning-banner" style={{ marginTop: 12 }}>
                <span>⚠</span><span>{error}</span>
              </div>
            )}

            <button
              id="run-batch-btn"
              className="btn-primary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={runBatch}
              disabled={!rows || loading}
            >
              {loading
                ? <><div className="spinner" /><span>Predicting…</span></>
                : <><span>🔮</span><span>Predict All ({rows?.length ?? 0} rows)</span></>
              }
            </button>
          </div>

          {/* Summary metrics if results */}
          {results ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>
                  Batch Summary
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Total Predictions', value: results.count },
                    { label: 'Mean SOH', value: `${(results.summary.mean_soh * 100).toFixed(2)}%` },
                    { label: 'Min SOH', value: `${(results.summary.min_soh * 100).toFixed(2)}%`, color: '#ff3366' },
                    { label: 'Max SOH', value: `${(results.summary.max_soh * 100).toFixed(2)}%`, color: '#00ff88' },
                  ].map((m) => (
                    <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--clr-border)', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--clr-text-2)' }}>{m.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: m.color || 'var(--clr-primary)' }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini scatter chart */}
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>
                  SOH vs Cycle
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="cycle" name="Cycle" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                    <YAxis dataKey="soh_pct" name="SOH %" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter
                      data={results.results}
                      fill="#00ff88"
                      fillOpacity={0.8}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, color: 'var(--clr-text-3)', gap: 12 }}>
              <div style={{ fontSize: '2rem' }}>🔮</div>
              <div style={{ fontSize: '0.9rem', textAlign: 'center' }}>
                Upload a CSV and click <strong style={{ color: 'var(--clr-primary)' }}>Predict All</strong><br />to see results here
              </div>
            </div>
          )}
        </div>

        {/* Results Table */}
        {results && (
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>
              Prediction Results
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cycle</th>
                    <th>Voltage (V)</th>
                    <th>Temp (°C)</th>
                    <th>Predicted SOH</th>
                    <th>SOH %</th>
                    <th>Health</th>
                    <th>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((r) => {
                    const color = healthColor(r.soh_pct);
                    return (
                      <tr key={r.index}>
                        <td style={{ color: 'var(--clr-text-3)' }}>{r.index + 1}</td>
                        <td>{r.cycle}</td>
                        <td>{r.voltage.toFixed(2)}</td>
                        <td>{r.temperature.toFixed(1)}</td>
                        <td style={{ color: 'var(--clr-primary)' }}>{r.soh.toFixed(4)}</td>
                        <td style={{ color, fontWeight: 700 }}>{r.soh_pct.toFixed(2)}%</td>
                        <td>
                          <span style={{
                            color,
                            background: `${color}22`,
                            padding: '2px 10px',
                            borderRadius: 999,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: `1px solid ${color}44`,
                          }}>
                            {r.health_status.label}
                          </span>
                        </td>
                        <td style={{ minWidth: 80 }}>
                          <div className="health-bar-track">
                            <div className="health-bar-fill" style={{ width: `${Math.min(r.soh_pct, 100)}%`, background: color }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
