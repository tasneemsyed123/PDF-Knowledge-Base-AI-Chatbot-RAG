/**
 * config/env.ts
 * --------------------------------------------------------------------------
 * Single source of truth for environment configuration. Every other module
 * imports `env` from here instead of calling `process.env` directly, so:
 *  - we fail fast (at boot) if a required variable is missing
 *  - types are known everywhere (no `string | undefined` leaking into code)
 *  - there is exactly one place to look when adding a new config value
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: required('MONGO_URI'),
  redisUrl: required('REDIS_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  // Shared with python-ai: the directory both services read/write uploaded
  // PDFs from. Both processes run natively in dev (docker-compose is infra
  // only), so a shared local path is enough - no volume mount needed.
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(__dirname, '../../../storage/uploads'),

  // How long a Document is allowed to sit in "processing" before the
  // staleDocumentReaper marks it "failed" (mitigates lost Pub/Sub messages).
  staleDocumentTimeoutMinutes: Number(process.env.STALE_DOCUMENT_TIMEOUT_MINUTES ?? 10),

  // How long the backend waits for a chat:response:{requestId} message
  // before giving up and returning an error to the client.
  chatRequestTimeoutMs: Number(process.env.CHAT_REQUEST_TIMEOUT_MS ?? 60_000),

  adminEmail: process.env.ADMIN_EMAIL ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  adminName: process.env.ADMIN_NAME ?? 'Admin',

  // Set to true ONLY when actually deployed behind a reverse proxy/load
  // balancer that sets X-Forwarded-For (nginx, ALB, etc). See app.ts.
  trustProxy: process.env.TRUST_PROXY === 'true',
};
