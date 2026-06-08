import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

const MACHINES = ['Motor MK7', 'Compressor CX2', 'Pump PX1'];

export default function SettingsPage({ machine, onChangeMachine, liveMode, onToggleLiveMode, deviceStatus }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="config-page">

      {/* ── Appearance ─────────────────────────────── */}
      <div className="config-section">
        <div className="config-section-title">Appearance</div>

        <div className="config-row">
          <div className="config-row-label">
            <span className="config-row-icon">{isDark ? '🌙' : '☀️'}</span>
            <div>
              <div className="config-row-name">{isDark ? 'Dark Mode' : 'Light Mode'}</div>
              <div className="config-row-sub">Changes the visual theme of the entire app</div>
            </div>
          </div>
          <button
            className={`theme-pill-toggle ${isDark ? 'theme-pill-dark' : 'theme-pill-light'}`}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <span className="theme-pill-moon">🌙</span>
            <span className="theme-pill-knob" />
            <span className="theme-pill-sun">☀️</span>
          </button>
        </div>

        {/* Theme preview swatches */}
        <div className="theme-preview-row">
          <div
            className={`theme-swatch ${isDark ? 'theme-swatch-active' : ''}`}
            onClick={() => isDark || toggleTheme()}
          >
            <div className="theme-swatch-preview theme-swatch-dark">
              <div className="swatch-bar" /><div className="swatch-card" /><div className="swatch-card" />
            </div>
            <div className="theme-swatch-label">
              {isDark && <span className="theme-swatch-check">✓</span>}
              Dark
            </div>
          </div>
          <div
            className={`theme-swatch ${!isDark ? 'theme-swatch-active' : ''}`}
            onClick={() => isDark && toggleTheme()}
          >
            <div className="theme-swatch-preview theme-swatch-light">
              <div className="swatch-bar swatch-bar-light" /><div className="swatch-card swatch-card-light" /><div className="swatch-card swatch-card-light" />
            </div>
            <div className="theme-swatch-label">
              {!isDark && <span className="theme-swatch-check">✓</span>}
              Light
            </div>
          </div>
        </div>
      </div>

      {/* ── Machine ────────────────────────────────── */}
      <div className="config-section">
        <div className="config-section-title">Active Machine</div>
        {MACHINES.map(m => (
          <label key={m} className="config-radio-row">
            <input
              type="radio"
              name="machine"
              value={m}
              checked={machine === m}
              onChange={() => onChangeMachine(m)}
              className="config-radio"
            />
            <span className="config-radio-label">{m}</span>
            {machine === m && <span className="config-radio-check">✓</span>}
          </label>
        ))}
      </div>

      {/* ── Data Source ────────────────────────────── */}
      <div className="config-section">
        <div className="config-section-title">Data Source</div>
        <div className="config-row">
          <div className="config-row-label">
            <span className="config-row-icon">📡</span>
            <div>
              <div className="config-row-name">Live Device Mode</div>
              <div className="config-row-sub">{liveMode ? 'Reading from hardware device' : 'Using simulated sensor data'}</div>
            </div>
          </div>
          <button
            className={`toggle-switch ${liveMode ? 'toggle-on' : ''}`}
            onClick={onToggleLiveMode}
            aria-label="Toggle live mode"
          >
            <span className="toggle-knob" />
          </button>
        </div>
        <div className="config-connection-status">
          <span className={`status-dot ${deviceStatus === 'connected' ? 'dot-live' : deviceStatus === 'disconnected' ? 'dot-err' : 'dot-sim'}`} />
          <span className="config-row-sub" style={{ marginLeft: 6 }}>
            {deviceStatus === 'simulation' ? 'Simulation running'
             : deviceStatus === 'connected' ? 'Live device connected'
             : 'Waiting for device…'}
          </span>
        </div>
      </div>

      {/* ── About ──────────────────────────────────── */}
      <div className="config-section">
        <div className="config-section-title">About</div>
        <div className="config-about-card">
          <div className="config-about-logo">⚙ RESILITWIN OS</div>
          <div className="config-about-version">v1.0  —  Industrial Safety Monitor</div>
          <div className="config-about-badge">
            <span className="config-ai-badge">🤖 Powered by OpenRouter AI</span>
          </div>
        </div>
        <button className="config-danger-btn" onClick={() => window.location.reload()}>
          🗑 Clear All Data &amp; Reload
        </button>
      </div>

    </div>
  );
}
