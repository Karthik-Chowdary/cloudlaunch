import WebSocket from 'ws';
import http from 'http';
import { WSMessage, StepProgress } from '../types';
import logger from '../middleware/logger';

class WebSocketManager {
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, Set<WebSocket>> = new Map(); // vmId -> Set<WebSocket>
  private allClients: Set<WebSocket> = new Set(); // clients subscribed to all updates

  initialize(server: http.Server): void {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('WebSocket client connected');
      this.allClients.add(ws);

      // Send connection ack
      this.sendToClient(ws, {
        type: 'connection_ack',
        payload: { message: 'Connected to CloudLaunch WebSocket' },
        timestamp: new Date().toISOString(),
      });

      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString());

          // Allow clients to subscribe to specific VM updates
          if (message.type === 'subscribe' && message.vmId) {
            const vmId = String(message.vmId);
            if (!this.clients.has(vmId)) {
              this.clients.set(vmId, new Set());
            }
            this.clients.get(vmId)!.add(ws);
            logger.info(`Client subscribed to VM ${vmId}`);
          }

          if (message.type === 'unsubscribe' && message.vmId) {
            const vmId = String(message.vmId);
            this.clients.get(vmId)?.delete(ws);
            logger.info(`Client unsubscribed from VM ${vmId}`);
          }
        } catch {
          logger.warn('Invalid WebSocket message received');
        }
      });

      ws.on('close', () => {
        this.allClients.delete(ws);
        // Remove from all VM subscriptions
        for (const [, clients] of this.clients) {
          clients.delete(ws);
        }
        logger.info('WebSocket client disconnected');
      });

      ws.on('error', (err: Error) => {
        logger.error(`WebSocket error: ${err.message}`);
        this.allClients.delete(ws);
      });
    });

    logger.info('WebSocket server initialized on /ws');
  }

  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (err: unknown) {
        const error = err as Error;
        logger.error(`Failed to send WebSocket message: ${error.message}`);
      }
    }
  }

  private broadcast(vmId: string, message: WSMessage): void {
    // Send to VM-specific subscribers
    const vmClients = this.clients.get(vmId);
    if (vmClients) {
      for (const client of vmClients) {
        this.sendToClient(client, message);
      }
    }

    // Send to all-subscribers
    for (const client of this.allClients) {
      // Avoid sending twice if client is also subscribed to the VM
      if (!vmClients || !vmClients.has(client)) {
        this.sendToClient(client, message);
      }
    }
  }

  sendVMUpdate(vmId: string, payload: unknown): void {
    this.broadcast(vmId, {
      type: 'vm_update',
      payload,
      vmId,
      timestamp: new Date().toISOString(),
    });
  }

  sendStepProgress(vmId: string, stepProgress: StepProgress): void {
    this.broadcast(vmId, {
      type: 'step_progress',
      payload: stepProgress,
      vmId,
      timestamp: new Date().toISOString(),
    });
  }

  sendStepOutput(vmId: string, stepId: string, output: string): void {
    this.broadcast(vmId, {
      type: 'step_output',
      payload: { stepId, output },
      vmId,
      timestamp: new Date().toISOString(),
    });
  }

  sendVMReady(vmId: string, payload: unknown): void {
    this.broadcast(vmId, {
      type: 'vm_ready',
      payload,
      vmId,
      timestamp: new Date().toISOString(),
    });
  }

  sendVMError(vmId: string, error: string): void {
    this.broadcast(vmId, {
      type: 'vm_error',
      payload: { error },
      vmId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Singleton
const wsManager = new WebSocketManager();
export default wsManager;
