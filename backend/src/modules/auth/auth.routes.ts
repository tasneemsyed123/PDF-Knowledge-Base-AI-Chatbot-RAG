/**
 * modules/auth/auth.routes.ts
 * --------------------------------------------------------------------------
 * Route wiring for /api/admin/auth/*.
 */
import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { authRateLimiter } from '../../middlewares/rateLimit.middleware';
import { loginSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/login', authRateLimiter, validateBody(loginSchema), asyncHandler(authController.login));
