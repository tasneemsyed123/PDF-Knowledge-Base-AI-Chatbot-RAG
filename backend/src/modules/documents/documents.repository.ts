/**
 * modules/documents/documents.repository.ts
 * --------------------------------------------------------------------------
 * The ONLY place in the codebase that talks to Mongoose for Document
 * records.
 */
import { DocumentModel, DocumentRecord, DocumentStatus } from '../../models/Document.model';

/**
 * Escapes regex metacharacters in user input before it's interpolated into
 * a Mongo $regex filter. Without this, a search string like `(a+)+$` could
 * trigger catastrophic backtracking (ReDoS) against every originalName in
 * the collection, or just behave unexpectedly (e.g. `.` matching any char).
 */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class DocumentsRepository {
  async create(data: { fileName: string; originalName: string; filePath: string; status: DocumentStatus }): Promise<DocumentRecord> {
    return DocumentModel.create(data);
  }

  async findById(id: string): Promise<DocumentRecord | null> {
    return DocumentModel.findById(id);
  }

  async list(search: string | undefined, page: number, limit: number): Promise<{ items: DocumentRecord[]; total: number }> {
    const filter = search ? { originalName: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const [items, total] = await Promise.all([
      DocumentModel.find(filter)
        .sort({ uploadDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      DocumentModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async delete(id: string): Promise<void> {
    await DocumentModel.deleteOne({ _id: id });
  }

  async updateStatus(
    id: string,
    update: { status: DocumentStatus; pageCount?: number; chunkCount?: number; errorMessage?: string | null },
  ): Promise<void> {
    await DocumentModel.updateOne({ _id: id }, update);
  }

  async markProcessing(id: string): Promise<void> {
    await DocumentModel.updateOne({ _id: id }, { status: 'processing', errorMessage: null });
  }

  async countTotal(): Promise<number> {
    return DocumentModel.countDocuments();
  }

  async recent(limit: number): Promise<DocumentRecord[]> {
    return DocumentModel.find().sort({ uploadDate: -1 }).limit(limit);
  }
}
