import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { DocumentsRepository } from '../documents/documents.repository';
import { ChatRepository } from '../chat/chat.repository';

const dashboardService = new DashboardService(new DocumentsRepository(), new ChatRepository());

export const dashboardController = {
  async stats(_req: Request, res: Response) {
    const data = await dashboardService.stats();
    res.status(200).json({ success: true, data });
  },
};
