/* GaugeChart.jsx — Animated SVG donut gauge for SOH display */
import { useEffect, useRef } from 'react';

const COLORS = {
  excellent: '#00ff88',
  good:      '#88ff00',
  fair:      '#ffaa00',
  critical:  '#ff3366',
};

function getColor(sohPct) {
  if (sohPct >= 90) return COLORS.excellent;
  if (sohPct >= 75) return COLORS.good;
  if (sohPct >= 60) return COLORS.fair;
  return COLORS.critical;
}

export default function GaugeChart({ sohPct = 0, healthLabel = '—', animDuration = 900 }) {
  const circumference = 2 * Math.PI * 54;   // r = 54
  const arc = circumference * 0.75;          // 270° gauge
  const offset = arc - (arc * Math.min(sohPct, 100)) / 100;

  const fillRef = useRef(null);
  const prevOffset = useRef(arc);

  useEffect(() => {
    if (!fillRef.current) return;
    fillRef.current.style.transition = `stroke-dashoffset ${animDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    fillRef.current.style.strokeDashoffset = offset;
    prevOffset.current = offset;
  }, [offset, animDuration]);

  const color = getColor(sohPct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg width="180" height="160" viewBox="0 0 140 120">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx="70" cy="74" r="54"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset="0"
          transform="rotate(135 70 74)"
        />

        {/* Fill */}
        <circle
          ref={fillRef}
          cx="70" cy="74" r="54"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={arc}
          transform="rotate(135 70 74)"
          filter="url(#glow)"
        />

        {/* SOH % text */}
        <text
          x="70" y="70"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="26"
          fontWeight="900"
          fontFamily="'JetBrains Mono', monospace"
        >
          {sohPct > 0 ? sohPct.toFixed(1) : '—'}
        </text>
        <text
          x="70" y="88"
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="9"
          fontWeight="500"
          fontFamily="'Inter', sans-serif"
          letterSpacing="1.5"
        >
          SOH %
        </text>

        {/* Tick labels */}
        <text x="14" y="116" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="'Inter', sans-serif">0</text>
        <text x="113" y="116" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="'Inter', sans-serif">100</text>
      </svg>

      {/* Health badge */}
      <div
        className="predict-health-badge"
        style={{ color, borderColor: `${color}55`, background: `${color}18` }}
      >
        <span>{healthLabel}</span>
      </div>
    </div>
  );
}
