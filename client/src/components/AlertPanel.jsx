import React from 'react';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

export default function AlertPanel({ alerts }) {
  return (
    <div className="alert-panel">
      <div className="alert-panel-header">
        <span className="chart-title">⚠ Alert Log</span>
        <span className="chart-sub">{alerts.length === 0 ? 'No active alerts' : `${alerts.length} alert${alerts.length > 1 ? 's' : ''}`}</span>
      </div>
      <div className="alert-list">
        {alerts.length === 0 ? (
          <div className="alert-empty">All systems nominal — no alerts detected</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`alert-card alert-${alert.severity.toLowerCase()} alert-slide-in`}>
              <div className="alert-left">
                <span className={`alert-badge badge-${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                <span className="alert-message">{alert.message}</span>
              </div>
              <div className="alert-time">{fmtTime(alert.timestamp)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
