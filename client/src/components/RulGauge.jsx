import React from 'react';

const CX = 110, CY = 108, R = 88;

function arcPoint(angle) {
  return { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
}

function foregroundPath(rul) {
  const frac = Math.min(1, Math.max(0, rul / 120));
  if (frac <= 0) return null;
  const end   = arcPoint(Math.PI * (1 - frac));
  const start = arcPoint(Math.PI);
  const largeArc = frac > 0.5 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function rulColor(rul) {
  if (rul < 20) return 'var(--danger)';
  if (rul < 50) return 'var(--warning)';
  return 'var(--success)';
}

function rulLabel(rul) {
  if (rul < 20) return 'CRITICAL';
  if (rul < 50) return 'WARNING';
  return 'HEALTHY';
}

export default function RulGauge({ rul = 0 }) {
  const color  = rulColor(rul);
  const fgPath = foregroundPath(rul);
  const startPt = arcPoint(Math.PI);
  const endPt   = arcPoint(0);
  const bgPath  = `M ${startPt.x.toFixed(2)} ${startPt.y.toFixed(2)} A ${R} ${R} 0 1 1 ${endPt.x.toFixed(2)} ${endPt.y.toFixed(2)}`;

  return (
    <div className="rul-gauge-wrap">
      <svg viewBox="0 0 220 130" className="rul-gauge-svg no-theme-transition">
        {/* Track */}
        <path d={bgPath} fill="none" stroke="var(--bg-secondary)" strokeWidth="14" strokeLinecap="round" />

        {/* Value arc */}
        {fgPath && (
          <path d={fgPath} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${rul < 20 ? '#c81e1e' : rul < 50 ? '#b45309' : '#1d8a4a'}88)` }} />
        )}

        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const a     = Math.PI * (1 - t);
          const inner = { x: CX + (R - 10) * Math.cos(a), y: CY - (R - 10) * Math.sin(a) };
          const outer = { x: CX + (R + 10) * Math.cos(a), y: CY - (R + 10) * Math.sin(a) };
          return <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--border)" strokeWidth="2" />;
        })}

        {/* Tick labels */}
        {[0, 30, 60, 90, 120].map(v => {
          const t = v / 120;
          const a = Math.PI * (1 - t);
          return (
            <text key={v}
              x={CX + (R + 22) * Math.cos(a)} y={CY - (R + 22) * Math.sin(a)}
              textAnchor="middle" dominantBaseline="middle"
              fill="var(--text-muted)" fontSize="9" fontFamily="'Courier New', monospace">
              {v}
            </text>
          );
        })}

        {/* Center value */}
        <text x={CX} y={CY - 14} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="38" fontWeight="900" fontFamily="'Courier New', monospace">
          {rul}
        </text>

        {/* Days label */}
        <text x={CX} y={CY + 20} textAnchor="middle"
          fill="var(--text-muted)" fontSize="10" fontFamily="'Inter', system-ui, sans-serif" fontWeight="600" letterSpacing="2">
          DAYS
        </text>

        {/* Status label */}
        <text x={CX} y={CY + 36} textAnchor="middle"
          fill={color} fontSize="9" fontFamily="'Courier New', monospace" fontWeight="700" letterSpacing="3">
          {rulLabel(rul)}
        </text>
      </svg>

      <div className="rul-gauge-caption">Estimated Days to Failure</div>
    </div>
  );
}
