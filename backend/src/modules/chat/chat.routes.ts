/**
 * modules/chat/chat.routes.ts
 * --------------------------------------------------------------------------
 * Public routes - no authMiddleware. `/ask` gets its own stricter rate
 * limiter since every call costs an LLM request and there's no login gate.
 */
import { Router } from 'express';
import { chatController } from './chat.controller';
import { validateBody, validateParams } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { chatRateLimiter } from '../../middlewares/rateLimit.middleware';
import { askSchema, historyParamsSchema } from './chat.schema';

export const chatRouter = Router();

chatRouter.post('/ask', chatRateLimiter, validateBody(askSchema), asyncHandler(chatController.ask));
chatRouter.get('/history/:sessionId', validateParams(historyParamsSchema), asyncHandler(chatController.history));
