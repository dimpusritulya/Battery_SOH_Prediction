/* DegradationSim.jsx — Simulate SOH degradation across cycles */
import { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart
} from 'recharts';

const API = (import.meta.env.VITE_API_BASE ?? '') + '/api';

const PRESETS = [
  { label: 'Room Temp, Nominal V',  voltage: 3.42, temperature: 26.0 },
  { label: 'High Temp, High V',     voltage: 3.70, temperature: 45.0 },
  { label: 'Low Temp, Low V',       voltage: 2.80, temperature: 10.0 },
  { label: 'Optimal Conditions',    voltage: 3.55, temperature: 22.0 },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = d.soh_pct >= 90 ? '#00ff88' : d.soh_pct >= 75 ? '#88ff00' : d.soh_pct >= 60 ? '#ffaa00' : '#ff3366';
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">Cycle {Math.round(d.cycle)}</div>
      <div className="tooltip-value" style={{ color }}>SOH: {d.soh_pct.toFixed(2)}%</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: 4 }}>
        Raw: {d.soh.toFixed(4)}
      </div>
    </div>
  );
};

/* Shared number input used for both voltage and temperature */
function ParamInput({ id, label, unit, hint, icon, value, rawValue, step, decimals, onChange, onBlur, accentColor = 'var(--clr-primary)' }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label
          htmlFor={id}
          style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </label>
        <span style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)' }}>{hint}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type="number"
          step={step}
          value={rawValue}
          placeholder={String(value)}
          onChange={onChange}
          onFocus={(e) => {
            e.target.style.borderColor = accentColor;
            e.target.style.boxShadow   = `0 0 0 3px ${accentColor}20`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--clr-border)';
            e.target.style.boxShadow   = 'none';
            if (onBlur) onBlur(e);
          }}
          style={{
            width: '100%',
            padding: '12px 52px 12px 16px',
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
        />
        <div style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          color: accentColor, fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
          fontWeight: 700, pointerEvents: 'none',
        }}>
          {unit}
        </div>
      </div>
    </div>
  );
}

export default function DegradationSim() {
  const [voltage,     setVoltage]     = useState(3.42);
  const [temperature, setTemperature] = useState(26.0);
  const [rawVoltage,  setRawVoltage]  = useState('3.42');
  const [rawTemp,     setRawTemp]     = useState('26.0');
  const [curveData,   setCurveData]   = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [animKey,     setAnimKey]     = useState(0);

  const runSim = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/simulate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ voltage, temperature, steps: 100 }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setCurveData(data);
      setAnimKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (p) => {
    setVoltage(p.voltage);
    setTemperature(p.temperature);
    setRawVoltage(String(p.voltage));
    setRawTemp(String(p.temperature));
  };

  const handleVoltageChange = (e) => {
    setRawVoltage(e.target.value);
    const num = parseFloat(e.target.value);
    if (!isNaN(num)) setVoltage(parseFloat(num.toFixed(2)));
  };

  const handleTempChange = (e) => {
    setRawTemp(e.target.value);
    const num = parseFloat(e.target.value);
    if (!isNaN(num)) setTemperature(parseFloat(num.toFixed(1)));
  };

  const degradation = curveData ? curveData.total_degradation : null;
  const startSoh    = curveData ? curveData.start_soh * 100   : null;
  const endSoh      = curveData ? curveData.end_soh   * 100   : null;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📉 Degradation Simulator</h2>
        <p className="section-subtitle">
          Enter voltage &amp; temperature, then simulate how SOH evolves across charge cycles
        </p>
      </div>

      <div className="grid-2" style={{ gap: 28, alignItems: 'start' }}>
        {/* Controls */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 20 }}>
            Simulation Parameters
          </div>

          {/* Presets */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-2)', marginBottom: 10 }}>Quick Presets</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 14px' }}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voltage input */}
          <ParamInput
            id="sim-voltage"
            label="Voltage"
            unit="V"
            hint="Terminal voltage"
            icon="⚡"
            value={voltage}
            rawValue={rawVoltage}
            step={0.01}
            decimals={2}
            accentColor="var(--clr-primary)"
            onChange={handleVoltageChange}
            onBlur={() => setRawVoltage(voltage.toFixed(2))}
          />

          {/* Temperature input */}
          <ParamInput
            id="sim-temperature"
            label="Temperature"
            unit="°C"
            hint="Cell / ambient temperature"
            icon="🌡"
            value={temperature}
            rawValue={rawTemp}
            step={0.1}
            decimals={1}
            accentColor="var(--clr-accent)"
            onChange={handleTempChange}
            onBlur={() => setRawTemp(temperature.toFixed(1))}
          />

          <button
            id="run-simulation-btn"
            className="btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={runSim}
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" /><span>Simulating…</span></>
            ) : (
              <><span>▶</span><span>Run Simulation</span></>
            )}
          </button>

          {/* Summary stats */}
          {curveData && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 20, borderTop: '1px solid var(--clr-border)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Results
              </div>
              {[
                { label: 'Start SOH',         value: `${startSoh.toFixed(2)}%` },
                { label: 'End SOH',           value: `${endSoh.toFixed(2)}%` },
                { label: 'Total Degradation', value: `${degradation.toFixed(2)}%`, color: degradation > 0 ? '#ff3366' : '#00ff88' },
              ].map((m) => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--clr-text-2)' }}>{m.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: m.color || 'var(--clr-primary)' }}>{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {error && <div className="warning-banner" style={{ marginTop: 16 }}><span>⚠</span><span>{error}</span></div>}
        </div>

        {/* Chart */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--clr-text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 20 }}>
            SOH Degradation Curve
          </div>

          {curveData ? (
            <ResponsiveContainer width="100%" height={340} key={animKey}>
              <AreaChart data={curveData.curve} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                <defs>
                  <linearGradient id="sohGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="cycle"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  label={{ value: 'Cycle', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0.90} stroke="#00ff88" strokeDasharray="4 4" label={{ value: '90% Excellent', fill: '#00ff8866', fontSize: 10 }} />
                <ReferenceLine y={0.75} stroke="#ffaa00" strokeDasharray="4 4" label={{ value: '75% Good',      fill: '#ffaa0066', fontSize: 10 }} />
                <ReferenceLine y={0.60} stroke="#ff3366" strokeDasharray="4 4" label={{ value: '60% Fair',      fill: '#ff336666', fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="soh"
                  stroke="#00ff88"
                  strokeWidth={2.5}
                  fill="url(#sohGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#00ff88', stroke: '#000', strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              height: 340,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--clr-text-3)', gap: 12,
            }}>
              <div style={{ fontSize: '2.5rem' }}>📊</div>
              <div style={{ fontSize: '0.9rem' }}>Enter values and click <strong style={{ color: 'var(--clr-primary)' }}>Run Simulation</strong></div>
              <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>The degradation curve will appear here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
