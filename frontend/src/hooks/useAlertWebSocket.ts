import { useEffect, useRef, useCallback } from 'react';
import { RealtimeAlert } from '../types';

const WS_BASE = (() => {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}`;
})();

export function useAlertWebSocket(onAlert: (alert: RealtimeAlert) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  const connect = useCallback(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/alerts/`);

    ws.onopen = () => {
      console.log('[WS] Alert channel connected');
    };

    ws.onmessage = (event) => {
      try {
        const data: RealtimeAlert = JSON.parse(event.data);
        if (data.event === 'new_alert') {
          onAlertRef.current(data);
        }
      } catch (err) {
        console.error('[WS] Failed to parse alert message', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Alert channel disconnected, reconnecting in 5s...');
      setTimeout(connect, 5000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Alert channel error', err);
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);
}
