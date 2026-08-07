import { Router } from 'express';
import { ActivityController } from '../controllers/activityController';

export function createActivityRoutes(controller: ActivityController): Router {
  const router = Router();

  router.get('/activities/export', controller.export);
  router.get('/activities', controller.list);
  router.put('/activities/:id', controller.update);
  router.patch('/activities/:id/status', controller.updateStatus);

  return router;
}
