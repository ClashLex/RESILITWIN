import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_HISTORY = 60;
const MAX_ALERTS  = 5;

function clamp(v, mn, mx) { return Math.min(Math.max(v, mn), mx); }
function rand(mn, mx)     { return Math.random() * (mx - mn) + mn; }

const MACHINE_CONFIGS = {
  'Motor MK7': { baseDefault: 0.5, step: 0.05, max: 9.5, min: 0.5, tempBase: 60, tempCoef: 0.4, tempMin: 45, tempMax: 85, voltBase: 228, voltRange: 5, voltMin: 215, voltMax: 240, currBase: 10.2, currCoef: 0.12, currMin: 7, currMax: 13, rulScale: 1.2 },
  'Compressor CX2': { baseDefault: 2.2, step: 0.08, max: 9.8, min: 1.8, tempBase: 74, tempCoef: 0.5, tempMin: 55, tempMax: 96, voltBase: 226, voltRange: 6, voltMin: 210, voltMax: 240, currBase: 12.8, currCoef: 0.18, currMin: 9, currMax: 16, rulScale: 1.1 },
  'Pump PX1': { baseDefault: 1.2, step: 0.06, max: 9.6, min: 0.8, tempBase: 68, tempCoef: 0.45, tempMin: 50, tempMax: 92, voltBase: 230, voltRange: 4, voltMin: 218, voltMax: 242, currBase: 11.0, currCoef: 0.15, currMin: 8, currMax: 14, rulScale: 1.2 }
};

function generateSensorData(machine, baseRef, triggerAnomaly) {
  const cfg = MACHINE_CONFIGS[machine] || MACHINE_CONFIGS['Motor MK7'];
  
  if (triggerAnomaly) {
    baseRef.current = 8.8;
  } else {
    baseRef.current += cfg.step + rand(-cfg.step / 2, cfg.step / 2);
    if (baseRef.current >= cfg.max) baseRef.current = cfg.min;
  }
  
  const vibration   = clamp(baseRef.current + rand(-0.2, 0.2), cfg.min, cfg.max);
  const temperature = clamp(cfg.tempBase + rand(-4, 4) + vibration * cfg.tempCoef, cfg.tempMin, cfg.tempMax);
  const voltage     = clamp(cfg.voltBase + rand(-cfg.voltRange, cfg.voltRange), cfg.voltMin, cfg.voltMax);
  const current     = clamp(cfg.currBase + rand(-1.0, 1.0) + vibration * cfg.currCoef, cfg.currMin, cfg.currMax);
  const rul         = Math.round(clamp(100 - (vibration / cfg.max) * 100, 0, 100) * cfg.rulScale);
  const status      = vibration > 7 ? 'CRITICAL' : vibration >= 4 ? 'WARNING' : 'NORMAL';
  
  return {
    timestamp:   new Date().toISOString(),
    vibration:   parseFloat(vibration.toFixed(3)),
    temperature: parseFloat(temperature.toFixed(2)),
    voltage:     parseFloat(voltage.toFixed(2)),
    current:     parseFloat(current.toFixed(3)),
    rul, status,
    anomaly: vibration > 7,
  };
}

function makeAlert(data) {
  const msg = data.anomaly
    ? `Vibration anomaly detected at ${data.vibration} mm/s`
    : data.status === 'WARNING'
    ? `Vibration elevated at ${data.vibration} mm/s`
    : `System status: ${data.status}`;
  return { id: Date.now() + Math.random(), timestamp: data.timestamp, severity: data.status, message: msg };
}

export function useWebSocket(machine = 'Motor MK7') {
  const [latest,       setLatest]       = useState(null);
  const [history,      setHistory]      = useState([]);
  const [alerts,       setAlerts]       = useState([]);
  const [allAlerts,    setAllAlerts]    = useState([]);
  const [connected,    setConnected]    = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isDemoMode,   setIsDemoMode]   = useState(true);
  
  const lastStatus     = useRef(null);
  const wsRef          = useRef(null);
  const reconnectTimer = useRef(null);
  const simTimer       = useRef(null);
  
  const vibrationBase  = useRef(MACHINE_CONFIGS[machine]?.baseDefault ?? 0.5);
  const localAnomalyTriggered = useRef(false);

  // Reset states on machine change
  useEffect(() => {
    vibrationBase.current = MACHINE_CONFIGS[machine]?.baseDefault ?? 0.5;
    localAnomalyTriggered.current = false;
    
    setLatest(null);
    setHistory([]);
    setAlerts([]);
    setAllAlerts([]);
    setInitializing(true);
  }, [machine]);

  const triggerLocalAnomaly = useCallback(() => {
    localAnomalyTriggered.current = true;
  }, []);

  const runSimTick = useCallback(() => {
    setHistory(prev => {
      const isAnomaly = localAnomalyTriggered.current;
      localAnomalyTriggered.current = false;
      
      const d = generateSensorData(machine, vibrationBase, isAnomaly);
      setLatest(d);
      
      if (lastStatus.current !== d.status || d.anomaly) {
        if (d.status === 'WARNING' || d.status === 'CRITICAL' || d.anomaly) {
          const alert = makeAlert(d);
          setAlerts(prevA => [alert, ...prevA].slice(0, MAX_ALERTS));
          setAllAlerts(prevA => [alert, ...prevA]);
        }
      }
      lastStatus.current = d.status;

      let nextHistory;
      if (prev.length === 0) {
        // Pre-populate history
        let tempBase = MACHINE_CONFIGS[machine]?.baseDefault ?? 0.5;
        const tempBaseRef = { current: tempBase };
        const pts = [];
        for (let i = 0; i < MAX_HISTORY; i++) {
          const pt = generateSensorData(machine, tempBaseRef, false);
          const time = new Date(Date.now() - (MAX_HISTORY - i) * 1000);
          pt.timestamp = time.toISOString();
          pts.push(pt);
        }
        pts[pts.length - 1] = d;
        nextHistory = pts;
      } else {
        nextHistory = [...prev, { ...d, index: prev.length }];
      }
      
      setInitializing(false);
      return nextHistory.length > MAX_HISTORY ? nextHistory.slice(-MAX_HISTORY) : nextHistory;
    });
  }, [machine]);

  const connect = useCallback(() => {
    const backendHost = import.meta.env.VITE_BACKEND_URL || window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${backendHost}/ws?machine=${encodeURIComponent(machine)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setIsDemoMode(false);
      setInitializing(false);
      if (simTimer.current) {
        clearInterval(simTimer.current);
        simTimer.current = null;
      }
    };

    ws.onerror = () => ws.close();

    ws.onclose = () => {
      setConnected(false);
      setIsDemoMode(true);
      if (!simTimer.current) {
        simTimer.current = setInterval(runSimTick, 1000);
      }
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'history') {
          const pts = msg.data.map((d, i) => ({ ...d, index: i }));
          setHistory(pts.slice(-MAX_HISTORY));
          if (pts.length > 0) {
            setLatest(pts[pts.length - 1]);
            lastStatus.current = pts[pts.length - 1].status;
          }
        } else if (msg.type === 'sensor') {
          const d = msg.data;
          setLatest(d);
          setHistory(prev => {
            const next = [...prev, { ...d, index: prev.length }];
            return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
          });

          if (lastStatus.current !== d.status || d.anomaly) {
            if (d.status === 'WARNING' || d.status === 'CRITICAL' || d.anomaly) {
              const alert = makeAlert(d);
              setAlerts(prev    => [alert, ...prev].slice(0, MAX_ALERTS));
              setAllAlerts(prev => [alert, ...prev]);
            }
          }
          lastStatus.current = d.status;
        }
      } catch {}
    };
  }, [machine, runSimTick]);

  useEffect(() => {
    runSimTick();
    if (!simTimer.current) {
      simTimer.current = setInterval(runSimTick, 1000);
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      if (simTimer.current) {
        clearInterval(simTimer.current);
        simTimer.current = null;
      }
      wsRef.current?.close();
    };
  }, [connect, runSimTick]);

  return { latest, history, alerts, allAlerts, connected, initializing, isDemoMode, triggerLocalAnomaly };
}
