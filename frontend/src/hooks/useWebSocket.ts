import { useEffect, useRef, useCallback, useState } from 'react';
import type { WSMessage } from '../types';

interface UseWebSocketOptions {
  vmId?: string;
  onMessage?: (msg: WSMessage) => void;
  onStepOutput?: (stepId: string, output: string) => void;
  onVmUpdate?: (payload: unknown) => void;
}

export function useWebSocket({ vmId, onMessage, onStepOutput, onVmUpdate }: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = vmId ? `${proto}//${host}/ws?vmId=${vmId}` : `${proto}//${host}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        onMessage?.(msg);

        if (msg.type === 'step_output' && onStepOutput) {
          const payload = msg.payload as { stepId: string; output: string };
          onStepOutput(payload.stepId, payload.output);
        }

        if ((msg.type === 'vm_update' || msg.type === 'vm_ready' || msg.type === 'vm_error') && onVmUpdate) {
          onVmUpdate(msg.payload);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [vmId, onMessage, onStepOutput, onVmUpdate]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
