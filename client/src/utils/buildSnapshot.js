export function buildSnapshot(latest, history, allAlerts, liveMode, machine = 'Motor MK7') {
  const last10 = (history || []).slice(-10);

  const vibTrend = last10.length > 2
    ? last10[last10.length - 1].vibration - last10[0].vibration > 0.5  ? 'increasing'
    : last10[last10.length - 1].vibration - last10[0].vibration < -0.5 ? 'decreasing'
    : 'stable'
    : 'stable';

  const tempTrend = last10.length > 2
    ? last10[last10.length - 1].temperature - last10[0].temperature > 2  ? 'increasing'
    : last10[last10.length - 1].temperature - last10[0].temperature < -2 ? 'decreasing'
    : 'stable'
    : 'stable';

  return {
    machine,
    mode:      liveMode ? 'Live Device' : 'Simulation',
    timestamp: new Date().toISOString(),
    sensors: {
      vibration:   latest?.vibration   ?? 0,
      temperature: latest?.temperature ?? 0,
      voltage:     latest?.voltage     ?? 0,
      current:     latest?.current     ?? 0,
      rul:         latest?.rul         ?? 0,
      status:      latest?.status      ?? 'NORMAL',
    },
    recentAlerts: (allAlerts || []).slice(0, 5).map(a => ({
      time: a.timestamp, severity: a.status, message: a.message,
    })),
    trendSummary: {
      vibrationTrend:     vibTrend,
      tempTrend,
      predictedFailureIn: latest?.rul != null ? `~${latest.rul} days` : 'unknown',
    },
  };
}
