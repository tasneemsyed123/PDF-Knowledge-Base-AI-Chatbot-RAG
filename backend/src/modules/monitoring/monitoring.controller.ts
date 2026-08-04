import { Request, Response } from 'express';
import { MonitoringService } from './monitoring.service';

const monitoringService = new MonitoringService();

export const monitoringController = {
  async stats(_req: Request, res: Response) {
    const data = await monitoringService.stats();
    res.status(200).json({ success: true, data });
  },
};
