/**
 * modules/reset/reset.service.ts
 * --------------------------------------------------------------------------
 * The admin "reset everything" danger-zone action: wipes every document
 * (Mongo record + file on disk + FAISS vectors, via the existing single-
 * document delete cascade), all chat sessions/messages, and the LLM usage
 * counters - a clean slate for the knowledge base and its activity history.
 *
 * Deliberately reuses DocumentsService.delete() per document rather than a
 * bulk Mongo/FS wipe of its own, so the exact same vector-purge and file-
 * cleanup cascade already trusted for single deletes applies here too -
 * one code path, not two that can drift apart.
 */
import { DocumentsRepository } from '../documents/documents.repository';
import { DocumentsService } from '../documents/documents.service';
import { ChatRepository } from '../chat/chat.repository';
import { redisPublisher } from '../../config/redis';
import { logger } from '../../utils/logger';

const LLM_USAGE_KEYS = ['llm:calls:total', 'llm:calls:by_provider', 'llm:calls:by_day'];

export class ResetService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly documentsService: DocumentsService,
    private readonly chatRepository: ChatRepository,
  ) {}

  async resetAll(): Promise<{ documentsDeleted: number }> {
    const documents = await this.documentsRepository.listAll();

    // Sequential, not Promise.all: each delete publishes a Redis message
    // and touches the shared FAISS index file - doing this concurrently
    // risks interleaved writes to that single on-disk index.
    let documentsDeleted = 0;
    for (const doc of documents) {
      try {
        await this.documentsService.delete(doc._id.toString());
        documentsDeleted += 1;
      } catch (err) {
        logger.error('Reset: failed to delete document', {
          documentId: doc._id.toString(),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await this.chatRepository.deleteAll();
    await Promise.all(LLM_USAGE_KEYS.map((key) => redisPublisher.del(key)));

    logger.warn('Admin reset: knowledge base wiped', { documentsDeleted });
    return { documentsDeleted };
  }
}
