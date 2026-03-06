import { Router, Request, Response } from 'express';
import vmRoutes from './vms';
import templateRoutes from './templates';
import launchRoutes from './launch';
import * as awsService from '../services/aws';
import logger from '../middleware/logger';

const router = Router();

// Mount sub-routes
router.use('/vms', vmRoutes);
router.use('/templates', templateRoutes);
router.use('/launch', launchRoutes);

// GET /api/config/regions
router.get('/config/regions', async (_req: Request, res: Response) => {
  try {
    const regions = await awsService.listRegions();
    res.json({ regions });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to list regions: ${error.message}`);
    res.status(500).json({ error: 'Failed to list regions' });
  }
});

// GET /api/config/instance-types
router.get('/config/instance-types', async (_req: Request, res: Response) => {
  try {
    const instanceTypes = await awsService.listInstanceTypes();
    res.json({ instanceTypes });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to list instance types: ${error.message}`);
    res.status(500).json({ error: 'Failed to list instance types' });
  }
});

// GET /api/config/amis
router.get('/config/amis', async (req: Request, res: Response) => {
  try {
    const region = req.query.region ? String(req.query.region) : undefined;
    const amis = await awsService.listAMIs(region);
    res.json({ amis });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to list AMIs: ${error.message}`);
    res.status(500).json({ error: 'Failed to list AMIs' });
  }
});

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'cloudlaunch',
    timestamp: new Date().toISOString(),
  });
});

export default router;
