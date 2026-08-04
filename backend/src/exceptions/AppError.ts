/**
 * exceptions/AppError.ts
 * --------------------------------------------------------------------------
 * Base class for all "expected" application errors - errors that represent
 * a known business/validation condition (not a bug), and therefore have a
 * defined HTTP status code and a safe-to-show-the-client message.
 *
 * Anything NOT thrown as an AppError (a raw bug/unexpected exception) is
 * treated by the error middleware as an unhandled 500 and its message is
 * NOT leaked to the client - only logged server-side.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request data') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class UpstreamTimeoutError extends AppError {
  constructor(message = 'The AI service did not respond in time. Please try again.') {
    super(message, 504, 'UPSTREAM_TIMEOUT');
  }
}
