import { Router, Request, Response } from 'express';
import * as templateService from '../services/templates';
import logger from '../middleware/logger';

const router = Router();

// GET /api/templates — list all templates
router.get('/', (_req: Request, res: Response) => {
  try {
    const templates = templateService.getAllTemplates();
    res.json({ templates });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to list templates: ${error.message}`);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// GET /api/templates/:id — template detail
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const template = templateService.getTemplateById(id);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json({ template });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to get template: ${error.message}`);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// POST /api/templates — create template
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, icon, tags, steps, defaultConfig } = req.body;

    if (!name || !description || !defaultConfig) {
      res.status(400).json({
        error: 'Missing required fields: name, description, defaultConfig',
      });
      return;
    }

    const template = templateService.createTemplate({
      name,
      description,
      icon,
      tags: tags || [],
      steps: steps || [],
      defaultConfig,
    });

    res.status(201).json({ template });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to create template: ${error.message}`);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id — update template
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updates = req.body;

    const updated = templateService.updateTemplate(id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ template: updated });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to update template: ${error.message}`);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id — delete template (not built-ins)
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    if (templateService.isBuiltIn(id)) {
      res.status(403).json({ error: 'Cannot delete built-in templates' });
      return;
    }

    const deleted = templateService.deleteTemplate(id);
    if (!deleted) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ message: 'Template deleted' });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to delete template: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
