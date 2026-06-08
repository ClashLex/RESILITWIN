import React from 'react';
import RulGauge from '../components/RulGauge.jsx';
import TrendChart from '../components/TrendChart.jsx';
import MaintenanceBox from '../components/MaintenanceBox.jsx';
import FullAlertLog from '../components/FullAlertLog.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';

export default function PredictiveAnalytics({ latest, history, allAlerts }) {
  const rul    = latest?.rul    ?? null;
  const status = latest?.status ?? 'NORMAL';

  return (
    <div className="analytics-page">
      {/* Row 1: Gauge + Maintenance */}
      <ScrollReveal direction="up" delay={0}>
        <div className="analytics-top">
          <div className="analytics-gauge">
            <RulGauge rul={rul ?? 0} />
          </div>
          <div className="analytics-maint">
            <ScrollReveal direction="right" delay={100}>
              <MaintenanceBox rul={rul} />
            </ScrollReveal>

            {/* Quick stats */}
            <div className="analytics-quick-stats">
              {[
                { label: 'Vibration',   value: latest?.vibration?.toFixed(3) ?? '—', unit: 'mm/s' },
                { label: 'Temperature', value: latest?.temperature?.toFixed(1) ?? '—', unit: '°C'   },
                { label: 'Current',     value: latest?.current?.toFixed(2)    ?? '—', unit: 'A'     },
                { label: 'Voltage',     value: latest?.voltage?.toFixed(1)    ?? '—', unit: 'V'     },
              ].map((s, i) => (
                <ScrollReveal key={s.label} direction="up" delay={150 + i * 60}>
                  <div className="quick-stat">
                    <div className="quick-stat-value">{s.value}</div>
                    <div className="quick-stat-label">{s.label} <span className="quick-stat-unit">{s.unit}</span></div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Row 2: Trend prediction chart */}
      <ScrollReveal direction="up" delay={200}>
        <TrendChart history={history} />
      </ScrollReveal>

      {/* Row 3: Full alert log */}
      <ScrollReveal direction="up" delay={300}>
        <FullAlertLog allAlerts={allAlerts} />
      </ScrollReveal>
    </div>
  );
}
