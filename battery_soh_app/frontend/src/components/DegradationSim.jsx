/* DegradationSim.jsx — Simulate SOH degradation across cycles */
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart
} from 'recharts';

const API = 'http://localhost:5001/api';

const PRESETS = [
  { label: 'Room Temp, Nominal V',   voltage: 3.42, temperature: 26.0 },
  { label: 'High Temp, High V',      voltage: 3.70, temperature: 45.0 },
  { label: 'Low Temp, Low V',        voltage: 2.80, temperature: 10.0 },
  { label: 'Optimal Conditions',     voltage: 3.55, temperature: 22.0 },
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

export default function DegradationSim() {
  const [voltage,     setVoltage]     = useState(3.42);
  const [temperature, setTemperature] = useState(26.0);
  const [curveData,   setCurveData]   = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [animKey,     setAnimKey]     = useState(0);

  const runSim = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voltage, temperature, steps: 100 }),
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
  };

  const degradation = curveData ? curveData.total_degradation : null;
  const startSoh    = curveData ? curveData.start_soh * 100 : null;
  const endSoh      = curveData ? curveData.end_soh   * 100 : null;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📉 Degradation Simulator</h2>
        <p className="section-subtitle">
          Fix voltage &amp; temperature, then simulate how SOH evolves across 168 charge cycles
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

          {/* Voltage Slider */}
          <div className="input-group">
            <label className="input-label">
              <span>Voltage</span>
              <span className="input-value">{voltage.toFixed(2)} V</span>
            </label>
            <input
              id="sim-voltage"
              type="range" className="slider"
              min={2.53} max={3.75} step={0.01}
              value={voltage}
              onChange={(e) => setVoltage(parseFloat(parseFloat(e.target.value).toFixed(2)))}
              style={{
                background: `linear-gradient(to right, var(--clr-primary) 0%, var(--clr-primary) ${
                  ((voltage - 2.53) / (3.75 - 2.53)) * 100
                }%, rgba(255,255,255,0.1) ${
                  ((voltage - 2.53) / (3.75 - 2.53)) * 100
                }%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
            <div className="slider-range"><span>2.53 V</span><span>3.75 V</span></div>
          </div>

          {/* Temperature Slider */}
          <div className="input-group">
            <label className="input-label">
              <span>Temperature</span>
              <span className="input-value">{temperature.toFixed(1)} °C</span>
            </label>
            <input
              id="sim-temperature"
              type="range" className="slider"
              min={7.68} max={54.99} step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(parseFloat(e.target.value).toFixed(1)))}
              style={{
                background: `linear-gradient(to right, var(--clr-accent) 0%, var(--clr-accent) ${
                  ((temperature - 7.68) / (54.99 - 7.68)) * 100
                }%, rgba(255,255,255,0.1) ${
                  ((temperature - 7.68) / (54.99 - 7.68)) * 100
                }%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
            <div className="slider-range"><span>7.68 °C</span><span>54.99 °C</span></div>
          </div>

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
                { label: 'Start SOH',       value: `${startSoh.toFixed(2)}%` },
                { label: 'End SOH',         value: `${endSoh.toFixed(2)}%` },
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
                <ReferenceLine y={0.75} stroke="#ffaa00" strokeDasharray="4 4" label={{ value: '75% Good', fill: '#ffaa0066', fontSize: 10 }} />
                <ReferenceLine y={0.60} stroke="#ff3366" strokeDasharray="4 4" label={{ value: '60% Fair', fill: '#ff336666', fontSize: 10 }} />
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--clr-text-3)',
              gap: 12,
            }}>
              <div style={{ fontSize: '2.5rem' }}>📊</div>
              <div style={{ fontSize: '0.9rem' }}>Set parameters and click <strong style={{ color: 'var(--clr-primary)' }}>Run Simulation</strong></div>
              <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>The degradation curve will appear here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
