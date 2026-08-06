/**
 * modules/documents/documents.controller.ts
 * --------------------------------------------------------------------------
 * Thin HTTP layer for the admin Knowledge Base Management endpoints.
 */
import { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { DocumentsRepository } from './documents.repository';
import { ValidationError } from '../../exceptions/AppError';
import type { ListDocumentsQuery } from './documents.schema';

// Exported singleton so server.ts can wire the Redis response handler to the
// same service instance the controller uses.
export const documentsService = new DocumentsService(new DocumentsRepository());

export const documentsController = {
  async upload(req: Request, res: Response) {
    if (!req.file) {
      throw new ValidationError('A PDF file is required (field name "file")');
    }
    const document = await documentsService.upload(req.file);
    res.status(201).json({ success: true, data: document });
  },

  async list(req: Request, res: Response) {
    const { search, page, limit } = req.query as unknown as ListDocumentsQuery;
    const { items, total } = await documentsService.list(search, page, limit);
    res.status(200).json({ success: true, data: { items, total, page, limit } });
  },

  async remove(req: Request, res: Response) {
    await documentsService.delete(req.params.id);
    res.status(200).json({ success: true, data: { message: 'Document deleted' } });
  },

  async reprocess(req: Request, res: Response) {
    const document = await documentsService.reprocess(req.params.id);
    res.status(200).json({ success: true, data: document });
  },

  async download(req: Request, res: Response) {
    const document = await documentsService.getFileForDownload(req.params.id);
    res.download(document.filePath, document.originalName);
  },
};
