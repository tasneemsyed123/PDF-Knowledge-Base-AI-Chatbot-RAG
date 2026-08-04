/**
 * modules/documents/documents.service.ts
 * --------------------------------------------------------------------------
 * Owns the document lifecycle: upload -> publish process request -> (later,
 * async) status update from python-ai's response -> delete/reprocess.
 *
 * The backend NEVER touches FAISS directly - it only tracks status/metadata
 * in Mongo and asks python-ai (over Redis Pub/Sub) to do the actual
 * extract/chunk/embed/store work.
 */
import fs from 'fs/promises';
import { DocumentsRepository } from './documents.repository';
import { DocumentRecord, DocumentStatus } from '../../models/Document.model';
import { publishDocumentProcessRequest, publishDocumentDeleteRequest } from '../../queue/redisPubSub';
import { NotFoundError, ValidationError } from '../../exceptions/AppError';
import { logger } from '../../utils/logger';

const PDF_MAGIC_BYTES = Buffer.from('%PDF-');

/**
 * multer's fileFilter only sees client-supplied mimetype/extension, which an
 * attacker fully controls (trivial to rename any file to .pdf with a spoofed
 * Content-Type). This checks the actual bytes on disk after upload - real
 * PDFs always start with "%PDF-". Cheap defense in depth against disguised
 * uploads before they're ever handed to pypdf/LangChain for parsing.
 */
async function isPdfContent(filePath: string): Promise<boolean> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(PDF_MAGIC_BYTES.length);
    const { bytesRead } = await handle.read(buffer, 0, PDF_MAGIC_BYTES.length, 0);
    return bytesRead === PDF_MAGIC_BYTES.length && buffer.equals(PDF_MAGIC_BYTES);
  } finally {
    await handle.close();
  }
}

export class DocumentsService {
  constructor(private readonly documentsRepository: DocumentsRepository) {}

  async upload(file: Express.Multer.File): Promise<DocumentRecord> {
    if (!(await isPdfContent(file.path))) {
      await fs.unlink(file.path).catch(() => undefined);
      throw new ValidationError('File is not a valid PDF');
    }

    const document = await this.documentsRepository.create({
      fileName: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      status: 'processing',
    });

    await publishDocumentProcessRequest(document._id.toString(), document.filePath, document.originalName);
    return document;
  }

  async list(search: string | undefined, page: number, limit: number) {
    return this.documentsRepository.list(search, page, limit);
  }

  async delete(id: string): Promise<void> {
    const document = await this.documentsRepository.findById(id);
    if (!document) throw new NotFoundError('Document not found');

    // Purge vectors first (fire-and-forget over Pub/Sub), then remove the
    // Mongo record and the file on disk. Order doesn't affect correctness
    // here - vector purge is async either way.
    await publishDocumentDeleteRequest(id);
    await this.documentsRepository.delete(id);

    await fs.unlink(document.filePath).catch((err) =>
      logger.warn('Failed to delete PDF file from disk', { documentId: id, error: err.message }),
    );
  }

  async reprocess(id: string): Promise<DocumentRecord> {
    const document = await this.documentsRepository.findById(id);
    if (!document) throw new NotFoundError('Document not found');

    await this.documentsRepository.markProcessing(id);
    // python-ai purges any existing chunks for this documentId before
    // re-embedding, so this is safe to call repeatedly (see
    // shared/redis-contract.md).
    await publishDocumentProcessRequest(id, document.filePath, document.originalName);

    return (await this.documentsRepository.findById(id))!;
  }

  /** Wired to the persistent PSUBSCRIBE handler registered at server boot. */
  async applyProcessResult(
    documentId: string,
    result: { status: 'completed' | 'failed'; pageCount?: number; chunkCount?: number; error?: string },
  ): Promise<void> {
    const status: DocumentStatus = result.status;
    await this.documentsRepository.updateStatus(documentId, {
      status,
      pageCount: result.pageCount,
      chunkCount: result.chunkCount,
      errorMessage: result.error ?? null,
    });
    logger.info('Applied document process result', { documentId, status });
  }
}
