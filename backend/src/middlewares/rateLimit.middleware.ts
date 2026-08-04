/**
 * middlewares/rateLimit.middleware.ts
 * --------------------------------------------------------------------------
 * Three limiters:
 *  - `globalRateLimiter`: generous, applied to the whole API.
 *  - `authRateLimiter`: strict, applied only to /admin/auth/login, to slow
 *    down credential brute-forcing.
 *  - `chatRateLimiter`: applied only to the public, unauthenticated
 *    /chat/ask endpoint - every call costs an LLM request, and there's no
 *    login gate to lean on, so this is the main abuse control for cost.
 */
import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' } },
});

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many questions - please wait a moment.' } },
});
