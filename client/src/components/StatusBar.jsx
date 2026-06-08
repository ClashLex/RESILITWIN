import React, { useState, useEffect, useRef } from 'react';

function rulColor(v)  { return v == null ? 'var(--text-muted)' : v < 20 ? 'var(--danger)' : v < 50 ? 'var(--warning)' : 'var(--success)'; }
function vibColor(v)  { return v == null ? 'var(--text-muted)' : v > 7  ? 'var(--danger)' : v >= 4  ? 'var(--warning)' : 'var(--success)'; }
function tempColor(v) { return v == null ? 'var(--text-muted)' : v > 85  ? 'var(--danger)' : v > 75  ? 'var(--warning)' : 'var(--accent)'; }

const CARDS = [
  { key: 'vibration',   label: 'Vibration',    unit: 'mm/s', icon: '〰',  color: (d) => vibColor(d?.vibration),   value: (d) => d?.vibration?.toFixed(2)  ?? '—', pct: (d) => d?.vibration != null ? Math.min((d.vibration / 9.5) * 100, 100) : 0, pctColor: (d) => vibColor(d?.vibration) },
  { key: 'temperature', label: 'Temperature',  unit: '°C',   icon: '🌡',  color: (d) => tempColor(d?.temperature), value: (d) => d?.temperature?.toFixed(1) ?? '—', pct: (d) => d?.temperature != null ? Math.min(((d.temperature - 55) / 40) * 100, 100) : 0, pctColor: (d) => tempColor(d?.temperature) },
  { key: 'voltage',     label: 'Voltage',      unit: 'V',    icon: '⚡',  color: ()  => 'var(--accent)',           value: (d) => d?.voltage?.toFixed(1)     ?? '—', pct: (d) => d?.voltage != null ? Math.min(((d.voltage - 210) / 30) * 100, 100) : 0, pctColor: () => 'var(--accent)' },
  { key: 'rul',         label: 'Remaining Life',unit: 'Days', icon: '⏱',  color: (d) => rulColor(d?.rul),          value: (d) => d?.rul                     ?? '—', pct: (d) => d?.rul != null ? Math.min(d.rul, 100) : 0, pctColor: (d) => rulColor(d?.rul) },
];

export default function StatusBar({ data }) {
  const prevRef   = useRef({});
  const [flashing, setFlashing] = useState({});

  useEffect(() => {
    if (!data) return;
    const now = {};
    CARDS.forEach(c => {
      const v = c.value(data);
      if (prevRef.current[c.key] !== undefined && prevRef.current[c.key] !== v) now[c.key] = true;
      prevRef.current[c.key] = v;
    });
    if (Object.keys(now).length > 0) {
      setFlashing(now);
      setTimeout(() => setFlashing({}), 400);
    }
  }, [data]);

  return (
    <div className="status-bar">
      {CARDS.map((card) => {
        const color = card.color(data);
        const pct = card.pct(data);
        return (
          <div
            key={card.key}
            className={`stat-card ${flashing[card.key] ? 'stat-card-flash' : ''}`}
            style={{ borderColor: color }}
            title={`${card.label}: ${card.value(data)} ${card.unit}`}
          >
            <div className="stat-icon" style={{ color }}>{card.icon}</div>
            <div className="stat-body">
              <div className="stat-value" style={{ color }}>{card.value(data)}</div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-unit">{card.unit}</div>
              <div className="stat-progress-track">
                <div
                  className="stat-progress-fill"
                  style={{
                    width: `${pct}%`,
                    background: color,
                    color: color,
                  }}
                />
              </div>
            </div>
            {data?.status && card.key === 'vibration' && (
              <div className={`stat-badge badge-${data.status.toLowerCase()}`}>{data.status}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
