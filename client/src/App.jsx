import React, { useState, useEffect, useRef, useMemo } from 'react';
import Navbar from './components/Navbar.jsx';
import StatusBar from './components/StatusBar.jsx';
import VibrationChart from './components/VibrationChart.jsx';
import RightPanel from './components/RightPanel.jsx';
import AlertPanel from './components/AlertPanel.jsx';
import TwinView3D from './components/TwinView3D.jsx';
import PredictiveAnalytics from './pages/PredictiveAnalytics.jsx';
import ConnectDevice from './pages/ConnectDevice.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import DiagnosticConsole from './components/DiagnosticConsole.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';
import { buildSnapshot } from './utils/buildSnapshot.js';
import { useTheme } from './context/ThemeContext.jsx';

const TABS = [
  { id: 'dashboard', icon: '▣', label: 'Dashboard'  },
  { id: '3d',        icon: '◈', label: '3D View'    },
  { id: 'analytics', icon: '◉', label: 'Analytics'  },
  { id: 'connect',   icon: '⊕', label: 'Device'     },
  { id: 'settings',  icon: '⚙', label: 'Settings'   },
];

const MACHINES = ['Motor MK7', 'Compressor CX2', 'Pump PX1'];

/* ── Inline helpers ───────────────────────────────────── */
function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <span className="loading-gear">⚙</span>
      <div className="loading-title">Initializing RESILITWIN OS…</div>
      <div className="loading-sub">Connecting to sensor network</div>
    </div>
  );
}

function DisconnectBanner() {
  return (
    <div className="disconnect-banner">
      <span className="disconnect-spinner" />
      <span>⚠ Connection lost. Reconnecting…</span>
    </div>
  );
}

function MobileSubNav({ machine, onChangeMachine, liveMode, onToggleLiveMode }) {
  const idx  = MACHINES.indexOf(machine);
  const prev = () => onChangeMachine(MACHINES[(idx - 1 + MACHINES.length) % MACHINES.length]);
  const next = () => onChangeMachine(MACHINES[(idx + 1) % MACHINES.length]);
  return (
    <div className="mobile-subnav">
      <div className="machine-sel-mobile">
        <button className="msm-btn" onClick={prev}>‹</button>
        <span className="msm-name">{machine}</span>
        <button className="msm-btn" onClick={next}>›</button>
      </div>
      <button
        className={`live-mode-pill ${liveMode ? 'live-mode-pill-on' : ''}`}
        onClick={onToggleLiveMode}
      >
        {liveMode ? '🔵 Live Device Mode' : '🟢 Simulation Mode'}
      </button>
    </div>
  );
}

/* ── Main App ─────────────────────────────────────────── */
export default function App() {
  const [machine,      setMachine]      = useState('Motor MK7');
  const { latest, history, alerts, allAlerts, connected, initializing } = useWebSocket(machine);
  const { theme } = useTheme();
  const [activeTab,    setActiveTab]    = useState('dashboard');
  const [liveMode,     setLiveMode]     = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('simulation');
  const [chatOpen,     setChatOpen]     = useState(false);
  const [aiAlerts,     setAiAlerts]     = useState([]);
  const prevStatusRef     = useRef(null);
  const lastAlertAtRef    = useRef(0);
  const ALERT_COOLDOWN_MS = 30000;

  const apiBase = import.meta.env.VITE_BACKEND_URL
    ? `${window.location.protocol}//${import.meta.env.VITE_BACKEND_URL}`
    : '';

  /* ── Sync active machine to backend ──────────────────── */
  useEffect(() => {
    const syncMachine = async () => {
      try {
        await fetch(`${apiBase}/api/machine`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ machineId: machine }),
        });
      } catch {}
    };
    syncMachine();
  }, [machine]);

  /* ── Live mode polling ──────────────────────────────── */
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`${apiBase}/api/mode`);
        const d = await r.json();
        setLiveMode(d.liveMode);
        setDeviceStatus(d.deviceStatus);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  const handleToggleLiveMode = async () => {
    const next = !liveMode;
    try {
      await fetch(`${apiBase}/api/mode`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ live: next }) });
      setLiveMode(next);
      setDeviceStatus(next ? 'disconnected' : 'simulation');
    } catch {}
  };

  const triggerAnomaly = async () => {
    try {
      await fetch(`${apiBase}/api/trigger-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine }),
      });
    } catch {}
  };

  /* ── Snapshot ───────────────────────────────────────── */
  const snapshot = useMemo(
    () => buildSnapshot(latest, history, allAlerts, liveMode, machine),
    [latest, history, allAlerts, liveMode, machine]
  );

  /* ── CRITICAL auto-alert ─────────────────────────────── */
  useEffect(() => {
    if (!latest) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = latest.status;
    if (latest.status !== 'CRITICAL') {
      if (prev === 'CRITICAL') lastAlertAtRef.current = 0;
      return;
    }
    if (prev === 'CRITICAL') return;

    const now = Date.now();
    if (now - lastAlertAtRef.current < ALERT_COOLDOWN_MS) return;
    lastAlertAtRef.current = now;

    const autoMsg = `The system just entered CRITICAL status. Vibration is at ${latest.vibration} mm/s and temperature is ${latest.temperature}°C. Generate a brief urgent maintenance alert for the operator with specific immediate actions.`;
    (async () => {
      try {
        const response = await fetch(`${apiBase}/api/chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: autoMsg, systemSnapshot: snapshot }),
        });
        if (!response.ok) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '', text = '';
        const id = Date.now();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n'); buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) text += data.text;
              if (data.done) setAiAlerts(prev => [{ id, content: text, ts: Date.now(), read: false }, ...prev]);
            } catch {}
          }
        }
      } catch {}
    })();
  }, [latest?.status]);

  const ackAlert    = (id) => setAiAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  const unreadCount = aiAlerts.filter(a => !a.read).length;
  const isCritical  = latest?.status === 'CRITICAL';

  const openChat = () => {
    setChatOpen(true);
    setAiAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  return (
    <div className={`app ${chatOpen ? 'chat-sidebar-open' : ''}`}>
      {initializing && <LoadingOverlay />}

      <Navbar
        connected={connected}
        liveMode={liveMode}
        onToggleLiveMode={handleToggleLiveMode}
        deviceStatus={deviceStatus}
        machine={machine}
        onChangeMachine={setMachine}
        onTriggerAnomaly={triggerAnomaly}
      />

      <MobileSubNav
        machine={machine}
        onChangeMachine={setMachine}
        liveMode={liveMode}
        onToggleLiveMode={handleToggleLiveMode}
      />

      {!connected && !initializing && <DisconnectBanner />}

      {/* Tab bar */}
      <div className="sub-nav" role="tablist" aria-label="Main navigation">
        {TABS.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={activeTab === t.id}
            aria-controls={`tabpanel-${t.id}`}
            className={`sub-nav-btn ${activeTab === t.id ? 'sub-nav-btn-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="sub-nav-icon" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
        {latest && (
          <div className={`sub-nav-status badge-${latest.status.toLowerCase()}`} aria-live="polite" aria-label={`Status: ${latest.status}`}>
            {latest.status}{latest.anomaly && <span className="anomaly-dot" aria-hidden="true" />}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div
        className="tab-content"
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'dashboard' && (
          <>
            <StatusBar data={latest} />
            <div className="main-content">
              <div className="main-left"><VibrationChart history={history} /></div>
              <div className="main-right"><RightPanel history={history} /></div>
            </div>
            <AlertPanel alerts={alerts} />
            <DiagnosticConsole latest={latest} history={history} />
          </>
        )}

        {activeTab === '3d' && (
          <div className="twin3d-page">
            <div className="twin3d-sidebar">
              <StatusBar data={latest} />
              <AlertPanel alerts={alerts} />
            </div>
            <div className="twin3d-view">
              <div className="twin3d-canvas-host">
                <TwinView3D
                  sensorData={latest}
                  status={latest?.status ?? 'NORMAL'}
                  theme={theme}
                  machine={machine}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <PredictiveAnalytics latest={latest} history={history} allAlerts={allAlerts} />
        )}

        {activeTab === 'connect' && <ConnectDevice />}

        {activeTab === 'settings' && (
          <SettingsPage
            machine={machine}
            onChangeMachine={setMachine}
            liveMode={liveMode}
            onToggleLiveMode={handleToggleLiveMode}
            deviceStatus={deviceStatus}
          />
        )}
      </div>

      {/* Mobile Anomaly FAB */}
      <button className="button-fab-danger" onClick={triggerAnomaly} title="Trigger anomaly">⚡</button>

      {/* Chat FAB */}
      <button
        className={`button-primary ${isCritical ? 'button-primary-critical' : ''}`}
        onClick={chatOpen ? () => setChatOpen(false) : openChat}
        title="AI Assistant"
      >
        🤖
        <span className="button-primary-label">AI Assistant</span>
        {unreadCount > 0 && <span className="button-primary-badge">{unreadCount}</span>}
      </button>

      {/* AI Alert toast overlay when panel is closed */}
      {!chatOpen && unreadCount > 0 && (
        <div className="ai-alert-overlay">
          {aiAlerts.filter(a => !a.read).map(alert => (
            <div key={alert.id} className="ai-alert-toast">
              <div className="ai-alert-toast-header">
                <span className="ai-alert-blink">⚠ AI ALERT</span>
                <div className="ai-alert-toast-btns">
                  <button onClick={() => ackAlert(alert.id)}>Acknowledge</button>
                  <button onClick={() => { openChat(); }}>Open Chat</button>
                </div>
              </div>
              <div className="ai-alert-toast-body">{alert.content.slice(0, 200)}{alert.content.length > 200 ? '…' : ''}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chat panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        snapshot={snapshot}
        latest={latest}
        aiAlerts={aiAlerts.filter(a => !a.read)}
        onAckAlert={ackAlert}
        status={latest?.status}
        machine={machine}
      />
    </div>
  );
}
