import { Router, Request, Response } from 'express';
import * as vmStore from '../services/vmStore';
import * as awsService from '../services/aws';
import { getConnectionInfo } from '../services/cursor';
import { removeNode } from '../services/teleport-service';
import wsManager from '../websocket';
import logger from '../middleware/logger';

const router = Router();

// GET /api/vms — list all VMs
router.get('/', (_req: Request, res: Response) => {
  try {
    const vms = vmStore.getAllVMs();
    res.json({ vms });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to list VMs: ${error.message}`);
    res.status(500).json({ error: 'Failed to list VMs' });
  }
});

// GET /api/vms/:id — VM detail
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const vm = vmStore.getVM(id);
    if (!vm) {
      res.status(404).json({ error: 'VM not found' });
      return;
    }

    // Redact private key in detail response
    const safeVM = { ...vm, privateKey: vm.privateKey ? '[REDACTED]' : '' };
    res.json({ vm: safeVM });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to get VM: ${error.message}`);
    res.status(500).json({ error: 'Failed to get VM' });
  }
});

// DELETE /api/vms/:id — terminate VM
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const vm = vmStore.getVM(id);
    if (!vm) {
      res.status(404).json({ error: 'VM not found' });
      return;
    }

    if (vm.status === 'terminated' || vm.status === 'terminating') {
      res.status(400).json({ error: `VM is already ${vm.status}` });
      return;
    }

    vmStore.updateVMStatus(id, 'terminating');
    wsManager.sendVMUpdate(id, { status: 'terminating' });

    // Terminate in background
    if (vm.awsInstanceId) {
      awsService
        .terminateInstance(vm.awsInstanceId, vm.config.region)
        .then(() => {
          // Deregister from Teleport (best-effort)
          try {
            removeNode(vm.name);
            logger.info(`Teleport node removed for VM ${id}`);
          } catch (teleportErr: unknown) {
            const tErr = teleportErr as Error;
            logger.warn(`Failed to remove Teleport node for VM ${id}: ${tErr.message}`);
          }

          vmStore.updateVMStatus(id, 'terminated');
          wsManager.sendVMUpdate(id, { status: 'terminated' });
        })
        .catch((terminateErr: Error) => {
          logger.error(
            `Failed to terminate instance ${vm.awsInstanceId}: ${terminateErr.message}`
          );
          vmStore.updateVMStatus(id, 'failed', terminateErr.message);
          wsManager.sendVMError(id, terminateErr.message);
        });
    } else {
      vmStore.updateVMStatus(id, 'terminated');
      wsManager.sendVMUpdate(id, { status: 'terminated' });
    }

    res.json({ message: 'VM termination initiated', vmId: id });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to terminate VM: ${error.message}`);
    res.status(500).json({ error: 'Failed to terminate VM' });
  }
});

// POST /api/vms/:id/connect — get connection info
router.post('/:id/connect', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const vm = vmStore.getVM(id);
    if (!vm) {
      res.status(404).json({ error: 'VM not found' });
      return;
    }

    if (vm.status !== 'running' && vm.status !== 'provisioning') {
      res.status(400).json({
        error: `VM is not ready for connection. Current status: ${vm.status}`,
      });
      return;
    }

    if (!vm.publicIp) {
      res.status(400).json({ error: 'VM does not have a public IP yet' });
      return;
    }

    const connectionInfo = getConnectionInfo(vm);
    res.json({ connection: connectionInfo });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to get connection info: ${error.message}`);
    res.status(500).json({ error: 'Failed to get connection info' });
  }
});

export default router;
