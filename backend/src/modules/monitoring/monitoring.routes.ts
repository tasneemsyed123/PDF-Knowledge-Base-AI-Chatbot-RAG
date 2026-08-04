import { Router } from 'express';
import { monitoringController } from './monitoring.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

export const monitoringRouter = Router();

monitoringRouter.use(authMiddleware);
monitoringRouter.get('/stats', asyncHandler(monitoringController.stats));
