import React from 'react';

function getRecommendation(rul) {
  if (rul === null || rul === undefined) {
    return { level: 'normal', title: 'Awaiting Data…', body: 'Connecting to sensor feed.' };
  }
  if (rul < 20) {
    return {
      level: 'critical',
      title: 'CRITICAL: Immediate Action Required',
      body: 'Bearing failure imminent. Initiate controlled shutdown and replace Bearing 3 immediately. Do not continue operation.',
    };
  }
  if (rul < 50) {
    return {
      level: 'warning',
      title: 'Warning: Maintenance Due Soon',
      body: 'Schedule maintenance within the next 2 weeks. Inspect Bearing 3 for wear indicators. Monitor vibration trend closely.',
    };
  }
  return {
    level: 'healthy',
    title: 'System Healthy',
    body: `No immediate action required. Next scheduled inspection in 45 days. All bearings within normal operating range.`,
  };
}

export default function MaintenanceBox({ rul }) {
  const { level, title, body } = getRecommendation(rul);
  return (
    <div className={`maint-box maint-${level}`}>
      <div className="maint-icon">
        {level === 'critical' ? '⚠' : level === 'warning' ? '⚡' : '✓'}
      </div>
      <div className="maint-body">
        <div className="maint-title">{title}</div>
        <div className="maint-text">{body}</div>
        {level !== 'normal' && (
          <div className="maint-rul-row">
            <span className="maint-rul-label">Current RUL</span>
            <span className="maint-rul-value">{rul} days</span>
          </div>
        )}
      </div>
    </div>
  );
}
