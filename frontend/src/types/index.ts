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

export interface ChatMessageRecord {
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

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export type ChatStreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'done'; sources: ChatSource[]; suggestedQuestions: string[] }
  | { type: 'error'; message: string };
