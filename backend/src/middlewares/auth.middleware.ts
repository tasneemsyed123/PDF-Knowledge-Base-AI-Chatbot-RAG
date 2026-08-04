/**
 * middlewares/auth.middleware.ts
 * --------------------------------------------------------------------------
 * Verifies the `Authorization: Bearer <token>` header on admin-only routes
 * and attaches the decoded admin identity to `req.admin`.
 */
import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../exceptions/AppError';

export interface AuthenticatedRequest extends Request {
  admin?: { adminId: string; email: string };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length);
  try {
    req.admin = verifyAccessToken(token);
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
