import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

const STATUS_CONFIG = {
  simulation:   { dot: 'dot-sim',  label: 'Simulation',  color: 'var(--success)' },
  connected:    { dot: 'dot-live', label: 'Live Device', color: 'var(--accent)'  },
  disconnected: { dot: 'dot-err',  label: 'No Device',   color: 'var(--danger)'  },
};

const MACHINES = ['Motor MK7', 'Compressor CX2', 'Pump PX1'];

function ThemeTogglePill() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      className={`theme-toggle-pill no-theme-transition${isDark ? '' : ' theme-pill-light'}`}
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-pressed={!isDark}
    >
      <span className="theme-toggle-icon-l" aria-hidden="true">🌙</span>
      <span className="theme-toggle-knob" />
      <span className="theme-toggle-icon-r" aria-hidden="true">☀️</span>
    </button>
  );
}

export default function Navbar({
  connected, liveMode, onToggleLiveMode, deviceStatus = 'simulation',
  machine, onChangeMachine, onTriggerAnomaly, isDemoMode,
}) {
  const { theme, toggleTheme } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = time.toLocaleTimeString('en-US', { hour12: false });
  const sc  = STATUS_CONFIG[deviceStatus] ?? STATUS_CONFIG.simulation;

  return (
    <nav className="global-nav">
      {/* Logo */}
      <div className="global-nav-logo">
        <span className="global-nav-logo-full">⚙ RESILITWIN</span>
        <span className="global-nav-logo-short">⚙ RTWIN</span>
      </div>
      {/* Center — connection status + machine name */}
      <div className="global-nav-center">
        <span className={`status-dot ${connected ? 'dot-live' : isDemoMode ? 'dot-demo' : 'dot-offline'}`}
          title={connected ? 'WebSocket live' : isDemoMode ? 'Running in local Demo Mode' : 'Reconnecting…'} />
        <span className="global-nav-machine">{machine ?? 'Motor MK7'}</span>
        <span className="global-nav-live global-nav-live-hide">{connected ? 'LIVE' : isDemoMode ? 'DEMO MODE' : 'RECONNECTING'}</span>
      </div>

      {/* Right — desktop controls */}
      <div className="global-nav-right">
        {/* Machine selector */}
        <select
          className="machine-select"
          value={machine}
          onChange={e => onChangeMachine && onChangeMachine(e.target.value)}
        >
          {MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Device status pill */}
        <div className="device-status-pill">
          <span className={`status-dot ${sc.dot}`} />
          <span className="device-status-label" style={{ color: sc.color }}>{sc.label}</span>
        </div>

        {/* Live mode toggle */}
        <div className="live-mode-toggle" title={liveMode ? 'Switch to Simulation' : 'Switch to Live Device'}>
          <span className={`lm-label ${!liveMode ? 'lm-active-label' : ''}`}>SIM</span>
          <button className={`toggle-switch ${liveMode ? 'toggle-on' : ''}`} onClick={onToggleLiveMode} aria-label="Toggle live mode">
            <span className="toggle-knob" />
          </button>
          <span className={`lm-label ${liveMode ? 'lm-active-label' : ''}`}>LIVE</span>
        </div>

        {/* Trigger Anomaly button */}
        <button className="button-dark-utility" onClick={onTriggerAnomaly} title="Trigger a sensor anomaly">
          ⚡ Anomaly
        </button>

        {/* Theme toggle pill */}
        <ThemeTogglePill />

        {/* Clock */}
        <div className="global-nav-time global-nav-clock-hide">
          <div className="time-main">{fmt}</div>
        </div>
      </div>

      {/* Mobile-only theme icon (always visible, outside .global-nav-right) */}
      <button
        className="global-nav-theme-mobile"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </nav>
  );
}
