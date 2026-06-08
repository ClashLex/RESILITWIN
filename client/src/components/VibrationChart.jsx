import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const tooltipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-card)',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-time">{fmtTime(d?.timestamp)}</div>
      <div className="tooltip-row">
        <span style={{ color: 'var(--accent)' }}>Vibration</span>
        <span>{d?.vibration?.toFixed(3)} mm/s</span>
      </div>
      <div className={`tooltip-status badge-${d?.status?.toLowerCase()}`}>{d?.status}</div>
    </div>
  );
};

export default function VibrationChart({ history }) {
  return (
    <div className="chart-card chart-main">
      <div className="chart-header">
        <span className="chart-title">Vibration — Live (mm/s)</span>
        <span className="chart-sub">Last 60 seconds</span>
      </div>
      <div className="no-theme-transition">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={fmtTime}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} contentStyle={tooltipStyle} />
            <ReferenceLine y={7} stroke="var(--danger)" strokeDasharray="6 3"
              label={{ value: 'CRITICAL 7.0', position: 'insideTopRight', fill: 'var(--danger)', fontSize: 11 }} />
            <ReferenceLine y={4} stroke="var(--warning)" strokeDasharray="4 4"
              label={{ value: 'WARNING 4.0', position: 'insideTopRight', fill: 'var(--warning)', fontSize: 11 }} />
            <Line type="monotone" dataKey="vibration" stroke="var(--accent)"
              strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
