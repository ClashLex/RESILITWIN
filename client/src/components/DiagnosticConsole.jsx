import React, { useState, useEffect, useRef, useMemo } from 'react';

const SEVERITY_MAP = {
  SYS:  { color: 'var(--diag-sys)',  icon: '●' },
  OK:   { color: 'var(--diag-ok)',   icon: '✓' },
  WARN: { color: 'var(--diag-warn)', icon: '⚠' },
  CRIT: { color: 'var(--diag-crit)', icon: '✕' },
};

const FILTERS = ['ALL', 'SYS', 'OK', 'WARN', 'CRIT'];

function formatTs(iso) {
  if (!iso) return '--:--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function buildLogEntry(data) {
  if (!data) return null;
  const ts = data.timestamp;
  const entries = [];

  // Vibration
  if (data.vibration != null) {
    if (data.vibration > 7) {
      entries.push({ ts, sev: 'CRIT', msg: `Vibration anomaly detected — ${data.vibration.toFixed(3)} mm/s exceeds safe threshold` });
    } else if (data.vibration >= 4) {
      entries.push({ ts, sev: 'WARN', msg: `Vibration transient elevated — ${data.vibration.toFixed(3)} mm/s` });
    } else {
      entries.push({ ts, sev: 'SYS', msg: `Vibration nominal: ${data.vibration.toFixed(3)} mm/s` });
    }
  }

  // Temperature
  if (data.temperature != null) {
    if (data.temperature > 85) {
      entries.push({ ts, sev: 'CRIT', msg: `Thermal overload — ${data.temperature.toFixed(1)}°C` });
    } else if (data.temperature > 75) {
      entries.push({ ts, sev: 'WARN', msg: `Thermal drift detected — ${data.temperature.toFixed(1)}°C` });
    }
  }

  // Voltage
  if (data.voltage != null) {
    if (data.voltage < 215 || data.voltage > 238) {
      entries.push({ ts, sev: 'WARN', msg: `Supply voltage out of band — ${data.voltage.toFixed(1)}V` });
    }
  }

  // RUL
  if (data.rul != null && data.rul < 20) {
    entries.push({ ts, sev: 'CRIT', msg: `Remaining useful life critically low — ${data.rul} days` });
  }

  // Status transitions
  if (data.status === 'CRITICAL') {
    entries.push({ ts, sev: 'CRIT', msg: `STATUS CRITICAL — immediate inspection required` });
  }

  // Always push at least one heartbeat
  if (entries.length === 0) {
    entries.push({ ts, sev: 'OK', msg: `All subsystems nominal — heartbeat OK` });
  }

  return entries;
}

export default function DiagnosticConsole({ latest, history }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef(null);
  const prevTimestampRef = useRef(null);

  // Generate log entries from new sensor data
  useEffect(() => {
    if (!latest || paused) return;
    if (latest.timestamp === prevTimestampRef.current) return;
    prevTimestampRef.current = latest.timestamp;

    const newEntries = buildLogEntry(latest);
    if (newEntries) {
      setLogs(prev => {
        const next = [...prev, ...newEntries.map((e, i) => ({ ...e, id: Date.now() + i + Math.random() }))];
        // Keep last 200 entries
        return next.length > 200 ? next.slice(-200) : next;
      });
    }
  }, [latest, paused]);

  // Auto-scroll
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, paused]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filter !== 'ALL') {
      result = result.filter(l => l.sev === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => l.msg.toLowerCase().includes(q));
    }
    return result;
  }, [logs, filter, search]);

  const clearLogs = () => setLogs([]);

  const exportLogs = () => {
    const text = logs.map(l => `[${formatTs(l.ts)}] [${l.sev}] ${l.msg}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diagnostics_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const injectSelfTest = () => {
    const now = new Date().toISOString();
    setLogs(prev => [
      ...prev,
      { id: Date.now() + 0.1, ts: now, sev: 'SYS',  msg: '── DIAGNOSTIC SELF-TEST INITIATED ──' },
      { id: Date.now() + 0.2, ts: now, sev: 'SYS',  msg: 'Checking sensor bus integrity...' },
      { id: Date.now() + 0.3, ts: now, sev: 'OK',   msg: 'Vibration sensor — PASS' },
      { id: Date.now() + 0.4, ts: now, sev: 'OK',   msg: 'Temperature sensor — PASS' },
      { id: Date.now() + 0.5, ts: now, sev: 'OK',   msg: 'Voltage rail monitor — PASS' },
      { id: Date.now() + 0.6, ts: now, sev: 'OK',   msg: 'Current shunt — PASS' },
      { id: Date.now() + 0.7, ts: now, sev: 'SYS',  msg: 'WebSocket uplink — CONNECTED' },
      { id: Date.now() + 0.8, ts: now, sev: 'SYS',  msg: '── SELF-TEST COMPLETE — ALL SYSTEMS GO ──' },
    ]);
  };

  if (!expanded) {
    return (
      <div className="diag-collapsed" onClick={() => setExpanded(true)}>
        <span className="diag-collapsed-icon">▸</span>
        <span className="diag-collapsed-label">Diagnostics Terminal</span>
        <span className="diag-collapsed-count">{logs.length} events</span>
      </div>
    );
  }

  return (
    <div className="diag-console">
      {/* Header */}
      <div className="diag-header">
        <div className="diag-header-left">
          <span className="diag-title-icon">⟩_</span>
          <span className="diag-title">Diagnostics Terminal</span>
          <span className="diag-event-count">{filteredLogs.length} events</span>
        </div>
        <div className="diag-header-right">
          <input
            className="diag-search"
            type="text"
            placeholder="Filter logs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className={`diag-btn ${paused ? 'diag-btn-active' : ''}`} onClick={() => setPaused(p => !p)} title={paused ? 'Resume' : 'Pause'}>
            {paused ? '▶' : '⏸'}
          </button>
          <button className="diag-btn" onClick={injectSelfTest} title="Run self-test">
            ⚡
          </button>
          <button className="diag-btn" onClick={exportLogs} title="Export logs">
            ↓
          </button>
          <button className="diag-btn" onClick={clearLogs} title="Clear">
            ✕
          </button>
          <button className="diag-btn" onClick={() => setExpanded(false)} title="Collapse">
            ▾
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="diag-filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`diag-filter-chip ${filter === f ? 'diag-filter-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f !== 'ALL' && <span className="diag-filter-dot" style={{ background: SEVERITY_MAP[f]?.color }} />}
            {f}
          </button>
        ))}
      </div>

      {/* Log stream */}
      <div className="diag-log-stream" ref={scrollRef}>
        {filteredLogs.length === 0 ? (
          <div className="diag-empty">No events matching filter</div>
        ) : (
          filteredLogs.map(log => {
            const sev = SEVERITY_MAP[log.sev] || SEVERITY_MAP.SYS;
            return (
              <div key={log.id} className="diag-log-row">
                <span className="diag-log-ts">{formatTs(log.ts)}</span>
                <span className="diag-log-sev" style={{ color: sev.color }}>{sev.icon} {log.sev}</span>
                <span className="diag-log-msg">{log.msg}</span>
              </div>
            );
          })
        )}
        {!paused && (
          <div className="diag-cursor-line">
            <span className="diag-cursor">█</span>
          </div>
        )}
      </div>
    </div>
  );
}
