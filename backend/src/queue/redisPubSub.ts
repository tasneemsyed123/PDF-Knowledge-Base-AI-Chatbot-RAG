/**
 * queue/redisPubSub.ts
 * --------------------------------------------------------------------------
 * All Redis Pub/Sub traffic to/from python-ai goes through this module. See
 * shared/redis-contract.md for the full channel/message contract. Two
 * distinct correlation patterns are used, matching whether an HTTP caller is
 * actively waiting on the result:
 *
 *  - Chat: a live streaming HTTP response is waiting, so we SUBSCRIBE to a
 *    per-request response channel BEFORE publishing the request (Redis
 *    Pub/Sub drops messages published with zero subscribers - subscribing
 *    first closes that race).
 *  - Documents: fire-and-forget, so a single PSUBSCRIBE registered once at
 *    boot handles every response as it arrives; no per-request subscribe
 *    churn needed.
 */
import { randomUUID } from 'crypto';
import { redisPublisher, redisSubscriber } from '../config/redis';
import { logger } from '../utils/logger';
import { UpstreamTimeoutError } from '../exceptions/AppError';
import type { ChatSource } from '../models/ChatMessage.model';

const CHAT_REQUEST_CHANNEL = 'chat:request';
const CHAT_RESPONSE_PREFIX = 'chat:response:';
const DOCUMENT_PROCESS_REQUEST_CHANNEL = 'document:process:request';
const DOCUMENT_PROCESS_RESPONSE_PATTERN = 'document:process:response:*';
const DOCUMENT_DELETE_REQUEST_CHANNEL = 'document:delete:request';

interface ChatHistoryTurn {
  question: string;
  answer: string;
}

interface ChatResponseMessage {
  chunk?: string;
  done: boolean;
  sources?: ChatSource[];
  suggestedQuestions?: string[];
  error?: string;
}

export interface ChatStreamResult {
  sources: ChatSource[];
  suggestedQuestions: string[];
}

/**
 * Publishes a chat question and streams the answer back via `onChunk` as it
 * arrives. Resolves once the final message (done: true) is received, or
 * rejects on timeout / an error reported by python-ai.
 */
export async function requestChatStream(
  params: { sessionId: string; question: string; chatHistory: ChatHistoryTurn[]; documentNames: string[] },
  onChunk: (chunk: string) => void,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<ChatStreamResult> {
  const requestId = randomUUID();
  const responseChannel = `${CHAT_RESPONSE_PREFIX}${requestId}`;

  return new Promise<ChatStreamResult>((resolve, reject) => {
    let settled = false;
    let timeoutHandle: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timeoutHandle);
      signal?.removeEventListener('abort', onAbort);
      redisSubscriber.unsubscribe(responseChannel).catch((err) =>
        logger.warn('Failed to unsubscribe chat response channel', { requestId, error: err.message }),
      );
    };

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    // Client disconnected (e.g. closed the browser tab mid-stream) - stop
    // waiting on python-ai and free the subscription immediately rather
    // than holding it until the timeout.
    const onAbort = () => {
      settle(() => reject(new Error('Client disconnected')));
    };
    signal?.addEventListener('abort', onAbort);

    timeoutHandle = setTimeout(() => {
      settle(() => reject(new UpstreamTimeoutError()));
    }, timeoutMs);

    redisSubscriber
      .subscribe(responseChannel, (rawMessage) => {
        let message: ChatResponseMessage;
        try {
          message = JSON.parse(rawMessage);
        } catch {
          logger.warn('Received malformed chat response message', { requestId, rawMessage });
          return;
        }

        if (message.error) {
          settle(() => reject(new Error(message.error)));
          return;
        }

        if (message.chunk) {
          onChunk(message.chunk);
        }

        if (message.done) {
          settle(() =>
            resolve({
              sources: message.sources ?? [],
              suggestedQuestions: message.suggestedQuestions ?? [],
            }),
          );
        }
      })
      .then(() => {
        // Subscribed successfully - only NOW publish, so no chunk can be
        // missed while the subscription was still being established.
        return redisPublisher.publish(
          CHAT_REQUEST_CHANNEL,
          JSON.stringify({
            requestId,
            sessionId: params.sessionId,
            question: params.question,
            chatHistory: params.chatHistory,
            documentNames: params.documentNames,
          }),
        );
      })
      .catch((err) => {
        settle(() => reject(err));
      });
  });
}

/** Registers the ONE persistent listener for all document-processing results. */
export async function registerDocumentProcessResponseHandler(
  handler: (documentId: string, payload: {
    status: 'completed' | 'failed';
    pageCount?: number;
    chunkCount?: number;
    error?: string;
  }) => void | Promise<void>,
): Promise<void> {
  await redisSubscriber.pSubscribe(DOCUMENT_PROCESS_RESPONSE_PATTERN, async (rawMessage, channel) => {
    const documentId = channel.slice('document:process:response:'.length);
    try {
      const payload = JSON.parse(rawMessage);
      await handler(documentId, payload);
    } catch (err) {
      logger.error('Failed to handle document process response', {
        documentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
  logger.info('Subscribed to document process responses', { pattern: DOCUMENT_PROCESS_RESPONSE_PATTERN });
}

export async function publishDocumentProcessRequest(
  documentId: string,
  filePath: string,
  originalName: string,
): Promise<void> {
  await redisPublisher.publish(
    DOCUMENT_PROCESS_REQUEST_CHANNEL,
    JSON.stringify({ documentId, filePath, originalName }),
  );
  logger.info('Published document process request', { documentId });
}

export async function publishDocumentDeleteRequest(documentId: string): Promise<void> {
  await redisPublisher.publish(DOCUMENT_DELETE_REQUEST_CHANNEL, JSON.stringify({ documentId }));
  logger.info('Published document delete request', { documentId });
}
