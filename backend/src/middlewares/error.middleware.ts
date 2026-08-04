/**
 * middlewares/error.middleware.ts
 * --------------------------------------------------------------------------
 * Centralized exception handling. Every controller/service throws instead of
 * building responses inline - this is the ONLY place that turns an error
 * into an HTTP response, so the error shape is guaranteed consistent
 * everywhere in the API:
 *   { success: false, error: { code, message } }
 *
 * Must be registered LAST in app.ts (after all routes) - Express identifies
 * error middleware by its 4-argument signature.
 */
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../exceptions/AppError';
import { logger } from '../utils/logger';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    // A streaming response (chat) had already sent chunks before failing -
    // we can't send a fresh JSON error body, just end the connection.
    res.end();
    return;
  }

  if (err.name === 'MulterError') {
    logger.warn('Upload rejected', { message: err.message, path: req.path });
    res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: err.message === 'File too large' ? 'File exceeds the 20MB limit' : err.message },
    });
    return;
  }

  if (err instanceof AppError) {
    logger.warn('Handled application error', {
      code: err.code,
      message: err.message,
      path: req.path,
    });
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
  });
}

/**
 * Wraps an async route handler so a rejected promise is forwarded to
 * errorMiddleware via next(err), instead of crashing the process (Express 4
 * does not do this automatically for async handlers).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
