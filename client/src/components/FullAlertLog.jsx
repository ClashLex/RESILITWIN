import React, { useRef, useEffect } from 'react';

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function downloadCSV(alerts) {
  const rows = [
    ['timestamp', 'severity', 'message'],
    ...alerts.map(a => [a.timestamp, a.severity, a.message]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `alert_log_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function FullAlertLog({ allAlerts }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [allAlerts.length]);

  return (
    <div className="chart-card full-alert-log">
      <div className="chart-header">
        <span className="chart-title">⚠ Full Session Alert Log</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="chart-sub">{allAlerts.length} event{allAlerts.length !== 1 ? 's' : ''}</span>
          <button
            className="export-btn"
            onClick={() => downloadCSV(allAlerts)}
            disabled={allAlerts.length === 0}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      <div className="full-log-list" ref={listRef}>
        {allAlerts.length === 0 ? (
          <div className="alert-empty">No alerts recorded this session.</div>
        ) : (
          allAlerts.map(a => (
            <div key={a.id} className={`log-row log-row-${a.severity.toLowerCase()}`}>
              <span className="log-ts">{fmtTime(a.timestamp)}</span>
              <span className={`alert-badge badge-${a.severity.toLowerCase()}`}>{a.severity}</span>
              <span className="log-msg">{a.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
