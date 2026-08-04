/**
 * modules/auth/auth.controller.ts
 * --------------------------------------------------------------------------
 * Thin HTTP layer: parses req/res, delegates to the service, returns the
 * standard success envelope `{ success: true, data: ... }`.
 */
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

const authService = new AuthService(new AuthRepository());

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.status(200).json({ success: true, data: result });
  },
};
