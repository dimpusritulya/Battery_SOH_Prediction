/* ModelInfo.jsx — Model performance metrics and feature info dashboard */
import { useState, useEffect } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Tooltip
} from 'recharts';

const API = 'http://localhost:5001/api';

const STATIC_METRICS = {
  name: 'Support Vector Regression (SVR)',
  kernel: 'RBF',
  C: 10,
  epsilon: 0.01,
  preprocessing: 'StandardScaler',
  mae:  0.0203,
  rmse: 0.0258,
  r2:   0.9314,
  training_records: 1062,
  test_records:     353,
  batteries_total:  34,
  features: ['cycle', 'voltage', 'temperature'],
  target: 'soh',
};

const COMPARISON_DATA = [
  { model: 'SVR',           r2: 0.9314, mae: 0.0203, rmse: 0.0258 },
  { model: 'Random Forest', r2: 0.8921, mae: 0.0312, rmse: 0.0389 },
  { model: 'Decision Tree', r2: 0.8102, mae: 0.0421, rmse: 0.0501 },
  { model: 'Linear Reg.',   r2: 0.7453, mae: 0.0533, rmse: 0.0611 },
];

const RADAR_DATA = [
  { metric: 'R² Score',    SVR: 93.1, RF: 89.2, DT: 81.0, LR: 74.5 },
  { metric: 'Low MAE',     SVR: 97.9, RF: 96.9, DT: 95.8, LR: 94.7 },
  { metric: 'Low RMSE',    SVR: 97.4, RF: 96.1, DT: 94.9, LR: 93.9 },
  { metric: 'Generalize',  SVR: 93,   RF: 86,   DT: 75,   LR: 80   },
  { metric: 'Speed',       SVR: 85,   RF: 70,   DT: 95,   LR: 99   },
];

function MetricBar({ label, value, max, color, format }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.83rem' }}>
        <span style={{ color: 'var(--clr-text-2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>{format(value)}</span>
      </div>
      <div className="health-bar-track" style={{ height: 8 }}>
        <div
          className="health-bar-fill"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function ModelInfo() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    fetch(`${API}/model_info`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setInfo(d); })
      .catch(() => {});
  }, []);

  const metrics = info?.metrics || STATIC_METRICS;
  const featureRanges = info?.feature_ranges || {
    cycle:       { min: 1,    max: 168,   mean: 55.39 },
    voltage:     { min: 2.53, max: 3.75,  mean: 3.42  },
    temperature: { min: 7.68, max: 54.99, mean: 26.59 },
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🧠 Model Intelligence</h2>
        <p className="section-subtitle">
          Trained SVR pipeline details, feature ranges, and performance benchmarks
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        {[
          { label: 'R² Score',    value: `${(metrics.r2 * 100).toFixed(1)}%`, desc: 'Variance explained',        color: '#00ff88' },
          { label: 'MAE',         value: metrics.mae.toFixed(4),               desc: 'Mean Absolute Error (SOH)', color: '#00e5ff' },
          { label: 'RMSE',        value: metrics.rmse.toFixed(4),              desc: 'Root Mean Squared Error',   color: '#0088ff' },
          { label: 'Batteries',   value: metrics.batteries_total,              desc: 'NASA dataset batteries',    color: '#aa88ff' },
          { label: 'Train Set',   value: `${metrics.training_records} rows`,   desc: 'Training records',          color: '#88ff00' },
          { label: 'Test Set',    value: `${metrics.test_records} rows`,       desc: 'Unseen test records',       color: '#ffaa00' },
        ].map((m) => (
          <div key={m.label} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
            <div className="metric-desc">{m.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
        {/* Model Architecture */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 20 }}>
            Model Architecture
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { key: 'Algorithm',     val: metrics.name },
              { key: 'Kernel',        val: metrics.kernel },
              { key: 'C (Reg.)',      val: metrics.C },
              { key: 'Epsilon',       val: metrics.epsilon },
              { key: 'Preprocessing', val: metrics.preprocessing },
              { key: 'Features',      val: metrics.features.join(', ') },
              { key: 'Target',        val: metrics.target.toUpperCase() },
            ].map(({ key, val }) => (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 8,
                padding: '10px 0',
                borderBottom: '1px solid var(--clr-border)',
                fontSize: '0.85rem',
              }}>
                <span style={{ color: 'var(--clr-text-2)', flexShrink: 0 }}>{key}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--clr-text)', textAlign: 'right' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Radar comparison */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>
            Model Comparison Radar
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginBottom: 16 }}>
            SVR vs other models tested (higher = better)
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={RADAR_DATA} outerRadius={90}>
              <PolarGrid stroke="rgba(255,255,255,0.07)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <Radar name="SVR"     dataKey="SVR" stroke="#00ff88" fill="#00ff88" fillOpacity={0.18} strokeWidth={2} />
              <Radar name="RF"      dataKey="RF"  stroke="#00e5ff" fill="#00e5ff" fillOpacity={0.10} strokeWidth={1.5} strokeDasharray="4 2" />
              <Radar name="Lin. R." dataKey="LR"  stroke="#ffaa00" fill="#ffaa00" fillOpacity={0.06} strokeWidth={1} strokeDasharray="2 2" />
              <Tooltip contentStyle={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-border-2)', borderRadius: 8, fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: '0.75rem', marginTop: 8 }}>
            {[['#00ff88','SVR (Best)'], ['#00e5ff','Random Forest'], ['#ffaa00','Linear Reg.']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span style={{ color: 'var(--clr-text-2)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Ranges + Model Comparison Table */}
      <div className="grid-2" style={{ gap: 24 }}>
        {/* Feature ranges */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 20 }}>
            Training Feature Ranges
          </div>
          {[
            { key: 'cycle',       label: 'Cycle Number', unit: '',    color: '#00ff88', max: 168 },
            { key: 'voltage',     label: 'Voltage',      unit: ' V',  color: '#00e5ff', max: 3.75 },
            { key: 'temperature', label: 'Temperature',  unit: ' °C', color: '#aa88ff', max: 54.99 },
          ].map((f) => {
            const r = featureRanges[f.key];
            return (
              <div key={f.key} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{f.label}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="range-badge">{r.min}{f.unit}</span>
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '0.75rem', alignSelf: 'center' }}>→</span>
                    <span className="range-badge">{r.max}{f.unit}</span>
                  </div>
                </div>
                <MetricBar
                  label={`Mean: ${r.mean}{f.unit}`}
                  value={r.mean}
                  max={r.max}
                  color={f.color}
                  format={(v) => `${v.toFixed(2)}${f.unit} avg`}
                />
              </div>
            );
          })}
        </div>

        {/* Model comparison table */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 20 }}>
            All Models Benchmarked
          </div>
          <table className="results-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>R²</th>
                <th>MAE</th>
                <th>RMSE</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((m, i) => (
                <tr key={m.model}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i === 0 && <span style={{ color: '#00ff88', fontSize: '0.8rem' }}>★</span>}
                    <span style={{ color: i === 0 ? '#00ff88' : 'var(--clr-text)' }}>{m.model}</span>
                  </td>
                  <td style={{ color: i === 0 ? '#00ff88' : 'var(--clr-text)', fontWeight: i === 0 ? 700 : 400 }}>
                    {(m.r2 * 100).toFixed(1)}%
                  </td>
                  <td>{m.mae.toFixed(4)}</td>
                  <td>{m.rmse.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 20, padding: 16, background: 'rgba(0,255,136,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,255,136,0.15)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-primary)', marginBottom: 8 }}>
              Why SVR Won
            </div>
            <ul style={{ fontSize: '0.8rem', color: 'var(--clr-text-2)', lineHeight: 1.7, paddingLeft: 16 }}>
              <li>Best generalization on unseen battery IDs</li>
              <li>RBF kernel captures nonlinear SOH patterns</li>
              <li>Robust to feature scale differences (via StandardScaler)</li>
              <li>Smallest test MAE = most accurate predictions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
