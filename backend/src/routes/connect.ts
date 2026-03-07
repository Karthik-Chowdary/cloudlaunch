import { Router, Request, Response } from 'express';
import * as vmStore from '../services/vmStore';
import * as teleportService from '../services/teleport-service';
import logger from '../middleware/logger';

const TELEPORT_CLUSTER = process.env.TELEPORT_CLUSTER || 'teleport.localhost';

const router = Router();

interface ConnectResponse {
  url: string | null;
  status: 'ready' | 'pending' | 'unavailable';
  message: string;
  retryAfterSeconds?: number;
}

/**
 * GET /api/vms/:id/connect
 *
 * Returns the Teleport web console URL for a VM.
 *
 * Statuses:
 *   - "ready"       — node found in Teleport, URL provided
 *   - "pending"     — VM exists but node hasn't joined Teleport yet
 *   - "unavailable" — VM is in a state where connection isn't possible
 */
router.get('/:id/connect', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const vm = vmStore.getVM(id);

    if (!vm) {
      res.status(404).json({ error: 'VM not found' });
      return;
    }

    // VM must be in a connectable state
    if (vm.status === 'terminated' || vm.status === 'terminating') {
      const response: ConnectResponse = {
        url: null,
        status: 'unavailable',
        message: `VM is ${vm.status} and cannot be connected to`,
      };
      res.json(response);
      return;
    }

    if (vm.status === 'launching') {
      const response: ConnectResponse = {
        url: null,
        status: 'pending',
        message: 'VM is still launching. Teleport agent will be available after provisioning completes.',
        retryAfterSeconds: 30,
      };
      res.json(response);
      return;
    }

    // Try to find the node in Teleport
    // Use the VM name as the lookup key (matches vm-name label or hostname)
    const nodeName = vm.name;

    try {
      const node = teleportService.getNodeByName(nodeName);

      if (!node) {
        // Check if the teleport-agent step has been attempted
        const teleportStep = vm.stepProgress.find((sp) => sp.stepId === 'teleport-agent');

        if (!teleportStep || teleportStep.status === 'pending' || teleportStep.status === 'running') {
          const response: ConnectResponse = {
            url: null,
            status: 'pending',
            message: 'Teleport agent is still being installed. Please try again shortly.',
            retryAfterSeconds: 15,
          };
          res.json(response);
          return;
        }

        if (teleportStep.status === 'failed') {
          const response: ConnectResponse = {
            url: null,
            status: 'unavailable',
            message: `Teleport agent installation failed: ${teleportStep.error || 'unknown error'}. Use SSH to connect instead.`,
          };
          res.json(response);
          return;
        }

        // Step completed but node not yet visible — may still be joining
        const response: ConnectResponse = {
          url: null,
          status: 'pending',
          message: 'Teleport agent installed but node has not joined the cluster yet. It may take a minute.',
          retryAfterSeconds: 10,
        };
        res.json(response);
        return;
      }

      // Node found — build the web console URL
      const url = `${process.env.TELEPORT_PROXY_URL || `https://${TELEPORT_CLUSTER}`}/web/cluster/${TELEPORT_CLUSTER}/console/node/${node.id}/${process.env.TELEPORT_SSH_USER || 'ubuntu'}`;

      const response: ConnectResponse = {
        url,
        status: 'ready',
        message: 'Teleport web terminal is available',
      };

      logger.info(`Connect URL generated for VM ${id}: ${url}`);
      res.json(response);
    } catch (err: unknown) {
      const error = err as Error;
      logger.error(`Failed to query Teleport for VM ${id}: ${error.message}`);

      // Teleport service unavailable — fall back gracefully
      const response: ConnectResponse = {
        url: null,
        status: 'unavailable',
        message: 'Teleport service is currently unavailable. Use SSH to connect instead.',
      };
      res.status(503).json(response);
    }
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to get connect info for VM: ${error.message}`);
    res.status(500).json({ error: 'Failed to get connection info' });
  }
});

export default router;
