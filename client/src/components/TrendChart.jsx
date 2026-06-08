import React, { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend, Scatter,
} from 'recharts';

function linearPredict(history, steps = 10) {
  const recent = history.slice(-10);
  if (recent.length < 2) return Array(steps).fill(null);
  const n   = recent.length;
  const xs  = recent.map((_, i) => i);
  const ys  = recent.map(d => d.vibration);
  const sx  = xs.reduce((a, b) => a + b, 0);
  const sy  = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sx2 = xs.reduce((a, x) => a + x * x, 0);
  const slope     = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return Array.from({ length: steps }, (_, i) => parseFloat(Math.max(0, Math.min(10, intercept + slope * (n + i))).toFixed(3)));
}

function fmtTick(label) {
  if (typeof label === 'string' && label.startsWith('+')) return label;
  if (!label) return '';
  return new Date(label).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const tooltipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-card)',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-time">{fmtTick(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="tooltip-row">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{p.value?.toFixed ? p.value.toFixed(3) : p.value} mm/s</span>
        </div>
      ))}
    </div>
  );
};

const FailureDot = (props) => {
  const { cx, cy, payload } = props;
  if (!payload?.isFailure) return null;
  if (!cx || !cy || isNaN(cx) || isNaN(cy)) return null;

  const textAnchor = cx > 250 ? 'end' : 'start';
  const textX = cx > 250 ? cx - 12 : cx + 12;

  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="var(--danger)" stroke="#ff0000" strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 6px var(--danger))' }} />
      <text x={textX} y={cy - 8} fill="var(--danger)" fontSize={10} fontWeight={700} fontFamily="var(--font-mono)" textAnchor={textAnchor}>
        PREDICTED FAILURE
      </text>
    </g>
  );
};

export default function TrendChart({ history }) {
  const chartData = useMemo(() => {
    const past = history.slice(-30).map(d => ({ label: d.timestamp, vibration: d.vibration, predicted: null, isFailure: false }));
    const preds = linearPredict(history, 10);
    let failIdx = -1;
    const future = preds.map((v, i) => {
      const isFail = v >= 9.0 && failIdx === -1;
      if (isFail) failIdx = i;
      return { label: `+${i + 1}s`, vibration: i === 0 ? (past.length > 0 ? past[past.length - 1].vibration : null) : null, predicted: v, isFailure: isFail };
    });
    return [...past, ...future];
  }, [history]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">Vibration Trend &amp; Prediction</span>
        <span className="chart-sub">30 actual + 10 projected points</span>
      </div>
      <div className="no-theme-transition">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 14, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tickFormatter={fmtTick} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} interval="preserveStartEnd" tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} contentStyle={tooltipStyle} />
            <Legend formatter={v => <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{v}</span>} />
            <ReferenceLine y={9.0} stroke="var(--danger)"  strokeDasharray="6 3"
              label={{ value: 'FAILURE 9.0',  position: 'insideTopRight', fill: 'var(--danger)',  fontSize: 10 }} />
            <ReferenceLine y={7.0} stroke="var(--danger)" strokeDasharray="4 4"
              label={{ value: 'CRITICAL 7.0', position: 'insideTopRight', fill: 'var(--danger)', fontSize: 10 }} />
            <ReferenceLine y={4.0} stroke="var(--warning)" strokeDasharray="4 4"
              label={{ value: 'WARNING 4.0', position: 'insideTopRight', fill: 'var(--warning)', fontSize: 10 }} />
            {history.length > 0 && (
              <ReferenceLine
                x={chartData.find(d => d.label?.startsWith('+'))?.label}
                stroke="var(--border)" strokeDasharray="2 4"
                label={{ value: 'PROJECTION', position: 'insideTopLeft', fill: 'var(--text-muted)', fontSize: 8 }}
              />
            )}
            <Line name="Actual"    type="monotone" dataKey="vibration" stroke="var(--accent)"  strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line name="Predicted" type="monotone" dataKey="predicted"  stroke="#b45309" strokeWidth={2} strokeDasharray="6 3" connectNulls isAnimationActive={false} dot={<FailureDot />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
