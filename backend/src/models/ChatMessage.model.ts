/**
 * models/ChatMessage.model.ts
 * --------------------------------------------------------------------------
 * One row per question/answer turn. `chat_history` sent to python-ai for
 * conversation memory is built by reading the last N of these per session.
 */
import { Schema, model, Document, Types } from 'mongoose';

export interface ChatSource {
  documentName: string;
  page?: number;
}

export interface ChatMessageDocument extends Document {
  _id: Types.ObjectId;
  sessionId: string;
  question: string;
  answer: string;
  sources: ChatSource[];
  suggestedQuestions: string[];
  timestamp: Date;
}

const chatSourceSchema = new Schema<ChatSource>(
  {
    documentName: { type: String, required: true },
    page: { type: Number },
  },
  { _id: false },
);

const chatMessageSchema = new Schema<ChatMessageDocument>({
  sessionId: { type: String, required: true, index: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  sources: { type: [chatSourceSchema], default: [] },
  suggestedQuestions: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now, index: true },
});

export const ChatMessageModel = model<ChatMessageDocument>('ChatMessage', chatMessageSchema);
