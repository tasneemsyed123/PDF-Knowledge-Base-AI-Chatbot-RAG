import { Request, Response } from 'express';
import { ResetService } from './reset.service';
import { DocumentsRepository } from '../documents/documents.repository';
import { DocumentsService } from '../documents/documents.service';
import { ChatRepository } from '../chat/chat.repository';

const resetService = new ResetService(new DocumentsRepository(), new DocumentsService(new DocumentsRepository()), new ChatRepository());

export const resetController = {
  async resetAll(_req: Request, res: Response) {
    const result = await resetService.resetAll();
    res.status(200).json({ success: true, data: result });
  },
};
