/**
 * models/ChatSession.model.ts
 * --------------------------------------------------------------------------
 * One row per browser session (sessionId is a client-generated uuid, kept
 * in sessionStorage - no login for the public chat). Upserted on first
 * message; used for the dashboard's "Total Chat Sessions" stat.
 */
import { Schema, model, Document, Types } from 'mongoose';

export interface ChatSessionDocument extends Document {
  _id: Types.ObjectId;
  sessionId: string;
  createdAt: Date;
  lastActivityAt: Date;
}

const chatSessionSchema = new Schema<ChatSessionDocument>({
  sessionId: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now },
  lastActivityAt: { type: Date, default: Date.now },
});

export const ChatSessionModel = model<ChatSessionDocument>('ChatSession', chatSessionSchema);
