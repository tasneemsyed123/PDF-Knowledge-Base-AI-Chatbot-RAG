/**
 * modules/dashboard/dashboard.service.ts
 * --------------------------------------------------------------------------
 * Aggregates the admin dashboard stats from the documents and chat
 * repositories - no new persistence of its own.
 */
import { DocumentsRepository } from '../documents/documents.repository';
import { ChatRepository } from '../chat/chat.repository';

const RECENT_DOCUMENTS_LIMIT = 5;

export class DashboardService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly chatRepository: ChatRepository,
  ) {}

  async stats() {
    const [totalDocuments, totalChatSessions, totalQuestionsAsked, recentDocuments] = await Promise.all([
      this.documentsRepository.countTotal(),
      this.chatRepository.countSessions(),
      this.chatRepository.countMessages(),
      this.documentsRepository.recent(RECENT_DOCUMENTS_LIMIT),
    ]);

    return { totalDocuments, totalChatSessions, totalQuestionsAsked, recentDocuments };
  }
}
