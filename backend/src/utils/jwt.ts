/**
 * utils/jwt.ts
 * --------------------------------------------------------------------------
 * Thin wrapper around jsonwebtoken so the rest of the app never imports the
 * library directly. Access-token-only auth (no refresh token) - fine for a
 * single admin account with a 2h token lifetime.
 */
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  adminId: string;
  email: string;
}

export function signAccessToken(payload: JwtPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  // Throws JsonWebTokenError / TokenExpiredError on invalid/expired tokens -
  // caught by the auth middleware and converted into an UnauthorizedError.
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
