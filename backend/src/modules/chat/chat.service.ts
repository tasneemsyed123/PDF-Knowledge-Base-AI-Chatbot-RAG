/**
 * modules/chat/chat.service.ts
 * --------------------------------------------------------------------------
 * Orchestrates one chat turn: load conversation memory, stream the answer
 * from python-ai over Redis Pub/Sub, persist the finished turn.
 */
import { ChatRepository } from './chat.repository';
import { requestChatStream, ChatStreamResult } from '../../queue/redisPubSub';
import { env } from '../../config/env';
import { ChatMessageDocument } from '../../models/ChatMessage.model';

export class ChatService {
  constructor(private readonly chatRepository: ChatRepository) {}

  async ask(
    sessionId: string,
    question: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ): Promise<ChatStreamResult> {
    await this.chatRepository.touchSession(sessionId);
    const chatHistory = await this.chatRepository.recentHistory(sessionId);

    let fullAnswer = '';
    const result = await requestChatStream(
      { sessionId, question, chatHistory },
      (chunk) => {
        fullAnswer += chunk;
        onChunk(chunk);
      },
      env.chatRequestTimeoutMs,
      signal,
    );

    await this.chatRepository.saveTurn(sessionId, question, fullAnswer, result.sources, result.suggestedQuestions);
    return result;
  }

  async history(sessionId: string): Promise<ChatMessageDocument[]> {
    return this.chatRepository.history(sessionId);
  }
}
