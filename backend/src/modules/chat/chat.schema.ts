/**
 * modules/chat/chat.schema.ts
 * --------------------------------------------------------------------------
 * Zod validation for the public chat endpoints.
 */
import { z } from 'zod';

export const askSchema = z.object({
  // The frontend only ever sends crypto.randomUUID() - enforcing the shape
  // here rejects arbitrarily large/malformed values before they reach Mongo
  // (used as a raw filter value) or get embedded in a Redis channel name.
  sessionId: z.string().trim().uuid('sessionId must be a valid UUID'),
  question: z.string().trim().min(1, 'Question is required').max(2000, 'Question is too long'),
});
export type AskInput = z.infer<typeof askSchema>;

export const historyParamsSchema = z.object({
  sessionId: z.string().trim().uuid('sessionId must be a valid UUID'),
});
