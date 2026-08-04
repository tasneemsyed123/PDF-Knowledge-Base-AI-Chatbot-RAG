/**
 * modules/chat/chat.repository.ts
 * --------------------------------------------------------------------------
 * The ONLY place in the codebase that talks to Mongoose for ChatSession and
 * ChatMessage documents.
 */
import { ChatSessionModel } from '../../models/ChatSession.model';
import { ChatMessageModel, ChatMessageDocument, ChatSource } from '../../models/ChatMessage.model';

const HISTORY_TURNS_FOR_CONTEXT = 6;

export class ChatRepository {
  async touchSession(sessionId: string): Promise<void> {
    await ChatSessionModel.updateOne(
      { sessionId },
      { $setOnInsert: { sessionId, createdAt: new Date() }, $set: { lastActivityAt: new Date() } },
      { upsert: true },
    );
  }

  /** Last N turns for this session, oldest first - used as LangGraph conversation memory. */
  async recentHistory(sessionId: string): Promise<{ question: string; answer: string }[]> {
    const messages = await ChatMessageModel.find({ sessionId })
      .sort({ timestamp: -1 })
      .limit(HISTORY_TURNS_FOR_CONTEXT);
    return messages.reverse().map((m) => ({ question: m.question, answer: m.answer }));
  }

  async saveTurn(
    sessionId: string,
    question: string,
    answer: string,
    sources: ChatSource[],
    suggestedQuestions: string[],
  ): Promise<ChatMessageDocument> {
    return ChatMessageModel.create({ sessionId, question, answer, sources, suggestedQuestions });
  }

  async history(sessionId: string): Promise<ChatMessageDocument[]> {
    return ChatMessageModel.find({ sessionId }).sort({ timestamp: 1 });
  }

  async countSessions(): Promise<number> {
    return ChatSessionModel.countDocuments();
  }

  async countMessages(): Promise<number> {
    return ChatMessageModel.countDocuments();
  }

  /** Used by the admin "reset everything" flow. */
  async deleteAll(): Promise<void> {
    await Promise.all([ChatSessionModel.deleteMany({}), ChatMessageModel.deleteMany({})]);
  }
}
