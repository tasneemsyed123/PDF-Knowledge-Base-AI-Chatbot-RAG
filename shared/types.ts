/**
 * shared/types.ts
 * --------------------------------------------------------------------------
 * Reference copy of the API's shape, shared conceptually between backend
 * and frontend (this repo isn't set up as an npm workspace, so these are
 * mirrored - not imported - into frontend/src/types; keep both in sync).
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DocumentRecord {
  _id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  uploadDate: string;
  status: DocumentStatus;
  pageCount?: number;
  chunkCount?: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSource {
  documentName: string;
  page?: number;
}

export interface ChatMessage {
  _id: string;
  sessionId: string;
  question: string;
  answer: string;
  sources: ChatSource[];
  suggestedQuestions: string[];
  timestamp: string;
}

export interface DashboardStats {
  totalDocuments: number;
  totalChatSessions: number;
  totalQuestionsAsked: number;
  recentDocuments: DocumentRecord[];
}

/** One line of the /api/chat/ask NDJSON stream. */
export type ChatStreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'done'; sources: ChatSource[]; suggestedQuestions: string[] }
  | { type: 'error'; message: string };
