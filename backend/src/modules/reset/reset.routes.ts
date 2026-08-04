import { Router } from 'express';
import { resetController } from './reset.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

export const resetRouter = Router();

resetRouter.use(authMiddleware);
resetRouter.post('/all', asyncHandler(resetController.resetAll));
