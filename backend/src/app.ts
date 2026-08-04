/**
 * app.ts
 * --------------------------------------------------------------------------
 * Express application wiring: security middleware, routes, error handling.
 * Kept separate from server.ts so tests can import the app (e.g. with
 * supertest) without actually binding a port or connecting to Mongo/Redis.
 */
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { globalRateLimiter } from './middlewares/rateLimit.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { authRouter } from './modules/auth/auth.routes';
import { documentsRouter } from './modules/documents/documents.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { monitoringRouter } from './modules/monitoring/monitoring.routes';
import { chatRouter } from './modules/chat/chat.routes';

export function createApp(): Application {
  const app = express();

  // Only trust X-Forwarded-For when actually deployed behind a known proxy
  // (nginx/ALB/etc, set TRUST_PROXY=true in that environment). Trusting it
  // unconditionally would let any client set X-Forwarded-For to spoof its
  // apparent IP and dodge express-rate-limit's per-IP buckets.
  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(globalRateLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/admin/auth', authRouter);
  app.use('/api/admin/documents', documentsRouter);
  app.use('/api/admin/dashboard', dashboardRouter);
  app.use('/api/admin/monitoring', monitoringRouter);
  app.use('/api/chat', chatRouter);

  // Must be registered LAST - Express identifies error middleware by its
  // 4-argument signature.
  app.use(errorMiddleware);

  return app;
}
