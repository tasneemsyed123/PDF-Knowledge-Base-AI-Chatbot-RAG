/**
 * lib/chatStream.ts
 * --------------------------------------------------------------------------
 * Reads the NDJSON stream from POST /api/chat/ask via fetch() +
 * ReadableStream - not EventSource, since that endpoint needs a POST body
 * (sessionId + question) that EventSource can't send. See docs/api.md.
 */
import type { ChatStreamEvent, ChatSource } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export async function streamChatAnswer(
  sessionId: string,
  question: string,
  handlers: {
    onChunk: (content: string) => void;
    onDone: (sources: ChatSource[], suggestedQuestions: string[]) => void;
    onError: (message: string) => void;
  },
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, question }),
    });
  } catch {
    handlers.onError('Could not reach the server. Please check your connection and try again.');
    return;
  }

  if (!response.ok || !response.body) {
    handlers.onError('Something went wrong. Please try again.');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      let event: ChatStreamEvent;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (event.type === 'chunk') handlers.onChunk(event.content);
      else if (event.type === 'done') handlers.onDone(event.sources, event.suggestedQuestions);
      else if (event.type === 'error') handlers.onError(event.message);
    }
  }
}
