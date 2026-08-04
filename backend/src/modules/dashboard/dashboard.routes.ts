import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);
dashboardRouter.get('/stats', asyncHandler(dashboardController.stats));
