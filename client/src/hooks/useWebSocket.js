import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_HISTORY = 60;
const MAX_ALERTS  = 5;

function makeAlert(data) {
  const msg = data.anomaly
    ? `Vibration anomaly detected at ${data.vibration} mm/s`
    : data.status === 'WARNING'
    ? `Vibration elevated at ${data.vibration} mm/s`
    : `System status: ${data.status}`;
  return { id: Date.now() + Math.random(), timestamp: data.timestamp, severity: data.status, message: msg };
}

export function useWebSocket() {
  const [latest,       setLatest]       = useState(null);
  const [history,      setHistory]      = useState([]);
  const [alerts,       setAlerts]       = useState([]);
  const [allAlerts,    setAllAlerts]    = useState([]);
  const [connected,    setConnected]    = useState(false);
  const [initializing, setInitializing] = useState(true);   // true until first successful connect
  const lastStatus     = useRef(null);
  const wsRef          = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setInitializing(false);
    };

    ws.onerror = () => ws.close();

    ws.onclose = () => {
      setConnected(false);
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
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { latest, history, alerts, allAlerts, connected, initializing };
}
