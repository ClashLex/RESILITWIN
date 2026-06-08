import React from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const tooltipBase = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-card)',
};

function MiniTooltip({ active, payload, color, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-time">{fmtTime(payload[0]?.payload?.timestamp)}</div>
      <div className="tooltip-row">
        <span style={{ color }}>{unit}</span>
        <span>{payload[0]?.value?.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function RightPanel({ history }) {
  return (
    <div className="right-panel">
      {/* Temperature */}
      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">Temperature (°C)</span>
          <span className="chart-sub">Last 60s</span>
        </div>
        <div className="no-theme-transition">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={history} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#b45309" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#b45309" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="timestamp" tickFormatter={fmtTime} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} interval="preserveStartEnd" tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<MiniTooltip color="#b45309" unit="Temp °C" />} contentStyle={tooltipBase} />
              <Area type="monotone" dataKey="temperature" stroke="#b45309" strokeWidth={2} fill="url(#tempGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Voltage */}
      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">Voltage (V)</span>
          <span className="chart-sub">Last 60s</span>
        </div>
        <div className="no-theme-transition">
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={history} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="timestamp" tickFormatter={fmtTime} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} interval="preserveStartEnd" tickLine={false} />
              <YAxis domain={[205, 245]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<MiniTooltip color="#0066cc" unit="Voltage V" />} contentStyle={tooltipBase} />
              <Line type="monotone" dataKey="voltage" stroke="#0066cc" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Current */}
      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">Current (A)</span>
          <span className="chart-sub">Last 60s</span>
        </div>
        <div className="no-theme-transition">
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={history} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="timestamp" tickFormatter={fmtTime} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} interval="preserveStartEnd" tickLine={false} />
              <YAxis domain={[6, 16]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<MiniTooltip color="#1d8a4a" unit="Current A" />} contentStyle={tooltipBase} />
              <Line type="monotone" dataKey="current" stroke="#1d8a4a" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
