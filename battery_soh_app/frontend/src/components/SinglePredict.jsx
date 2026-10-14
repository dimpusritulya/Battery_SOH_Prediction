/* SinglePredict.jsx — Live prediction with free-form number inputs */
import { useState, useEffect, useCallback, useRef } from 'react';
import GaugeChart from './GaugeChart';

const API = (import.meta.env.VITE_API_BASE ?? '') + '/api';

const FEATURES = [
  {
    key: 'cycle',
    label: 'Cycle Number',
    unit: '',
    step: 1,
    decimals: 0,
    default: 50,
    placeholder: 'e.g. 50',
    hint: 'Charge–discharge cycle count',
    icon: '🔁',
  },
  {
    key: 'voltage',
    label: 'Voltage',
    unit: 'V',
    step: 0.01,
    decimals: 2,
    default: 3.42,
    placeholder: 'e.g. 3.42',
    hint: 'Terminal voltage in Volts',
    icon: '⚡',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    step: 0.1,
    decimals: 1,
    default: 26.6,
    placeholder: 'e.g. 26.6',
    hint: 'Ambient / cell temperature',
    icon: '🌡',
  },
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
          { pct: 60,  label: 'Critical', color: '#ff3366' },
          { pct: 75,  label: 'Fair',     color: '#ffaa00' },
          { pct: 90,  label: 'Good',     color: '#88ff00' },
          { pct: 100, label: 'Excellent',color: '#00ff88' },
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
    cycle:       50,
    voltage:     3.42,
    temperature: 26.6,
  });
  // Raw string state so user can type freely (e.g. "3." without freezing)
  const [raw, setRaw] = useState({
    cycle:       '50',
    voltage:     '3.42',
    temperature: '26.6',
  });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const debounceTimer = useRef(null);

  const predict = useCallback(async (vals) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(vals),
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

  // Auto-predict with 400 ms debounce after any value change
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => predict(values), 400);
    return () => clearTimeout(debounceTimer.current);
  }, [values, predict]);

  const handleChange = (key, rawVal, decimals) => {
    setRaw((r) => ({ ...r, [key]: rawVal }));
    const num = parseFloat(rawVal);
    if (!isNaN(num)) {
      setValues((v) => ({ ...v, [key]: parseFloat(num.toFixed(decimals)) }));
    }
  };

  const sohPct      = result ? result.soh_pct          : 0;
  const healthLabel = result ? result.health_status.label : '—';
  const healthColor = result ? result.health_status.color : '#888';

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">⚡ Live SOH Prediction</h2>
        <p className="section-subtitle">
          Enter battery parameters to predict State of Health in real time
        </p>
      </div>

      <div className="grid-2" style={{ gap: 28 }}>
        {/* LEFT — Inputs */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{
            marginBottom: 24, paddingBottom: 16,
            borderBottom: '1px solid var(--clr-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Input Parameters
            </div>
            {loading && (
              <div className="spinner" style={{ borderTopColor: 'var(--clr-primary)', border: '2px solid rgba(0,255,136,0.2)' }} />
            )}
          </div>

          {FEATURES.map((feat) => (
            <div key={feat.key} style={{ marginBottom: 22 }}>
              {/* Label row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <label
                  htmlFor={`input-${feat.key}`}
                  style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--clr-text-2)', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span>{feat.icon}</span>
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.6px', fontSize: '0.78rem' }}>
                    {feat.label}
                  </span>
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)' }}>{feat.hint}</span>
              </div>

              {/* Number input */}
              <div style={{ position: 'relative' }}>
                <input
                  id={`input-${feat.key}`}
                  type="number"
                  step={feat.step}
                  value={raw[feat.key]}
                  placeholder={feat.placeholder}
                  onChange={(e) => handleChange(feat.key, e.target.value, feat.decimals)}
                  style={{
                    width: '100%',
                    padding: '12px 56px 12px 16px',
                    background: 'var(--clr-surface-2)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--clr-text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    appearance: 'none',
                    MozAppearance: 'textfield',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--clr-primary)';
                    e.target.style.boxShadow   = '0 0 0 3px rgba(0,255,136,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--clr-border)';
                    e.target.style.boxShadow   = 'none';
                    // Reformat on blur
                    const num = parseFloat(raw[feat.key]);
                    if (!isNaN(num)) {
                      setRaw((r) => ({ ...r, [feat.key]: num.toFixed(feat.decimals) }));
                    }
                  }}
                />
                {/* Unit badge */}
                {feat.unit && (
                  <div style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--clr-primary)', fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem', fontWeight: 700, pointerEvents: 'none',
                  }}>
                    {feat.unit}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 4, paddingTop: 20, borderTop: '1px solid var(--clr-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-2)', marginBottom: 8 }}>
              ⚡ Predictions update automatically as you type
            </div>
            <div className="info-banner">
              No input limits — model was trained on NASA Battery Aging Dataset (34 batteries, 1,415 cycles). Out-of-range values will show a warning.
            </div>
          </div>
        </div>

        {/* RIGHT — Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Gauge */}
          <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {error ? (
              <div style={{ color: 'var(--clr-critical)', textAlign: 'center', padding: 20, fontSize: '0.88rem' }}>
                ⚠ {error}
              </div>
            ) : (
              <>
                <GaugeChart sohPct={sohPct} healthLabel={healthLabel} />
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
                { label: 'SOH Value', value: result.soh.toFixed(4),         unit: '' },
                { label: 'SOH %',    value: result.soh_pct.toFixed(2),      unit: '%' },
                { label: 'Status',   value: result.health_status.label,     unit: '', color: healthColor },
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
