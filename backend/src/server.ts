/**
 * server.ts
 * --------------------------------------------------------------------------
 * Process entry point: connects to MongoDB + Redis, registers the
 * persistent document-processing response handler, starts the stale
 * document reaper, then binds the HTTP server. Order matters - we don't
 * want to accept traffic before Mongo/Redis are reachable.
 */
import { createApp } from './app';
import { env } from './config/env';
import { connectToDatabase } from './config/db';
import { connectToRedis } from './config/redis';
import { registerDocumentProcessResponseHandler } from './queue/redisPubSub';
import { startStaleDocumentReaper } from './queue/staleDocumentReaper';
import { documentsService } from './modules/documents/documents.controller';
import { logger } from './utils/logger';

/**
 * Last-resort safety net for bugs that escape every other error boundary
 * (asyncHandler on routes, try/catch in the redis pub/sub helpers, etc).
 * Node's own default behavior for these is inconsistent across versions -
 * we make it explicit: log with full context, then exit so a process
 * supervisor (systemd/Docker/PM2) restarts into a clean state rather than
 * limping along with potentially corrupted in-memory state.
 */
function registerProcessSafetyNet(): void {
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection - exiting', {
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception - exiting', { message: err.message, stack: err.stack });
    process.exit(1);
  });
}

async function bootstrap() {
  registerProcessSafetyNet();

  await connectToDatabase();
  await connectToRedis();

  await registerDocumentProcessResponseHandler((documentId, payload) =>
    documentsService.applyProcessResult(documentId, payload),
  );

  startStaleDocumentReaper();

  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`, { env: env.nodeEnv });
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal error during bootstrap', { message: err.message, stack: err.stack });
  process.exit(1);
});
