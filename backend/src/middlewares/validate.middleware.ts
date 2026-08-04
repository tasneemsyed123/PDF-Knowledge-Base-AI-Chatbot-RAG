/**
 * middlewares/validate.middleware.ts
 * --------------------------------------------------------------------------
 * Generic Zod-schema-driven request validator. Each route supplies its own
 * Zod schema (see each module's own ".schema.ts" file); this middleware runs
 * it against req.body/req.query and throws a ValidationError with a
 * readable message on failure, keeping validation logic out of controllers.
 */
import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../exceptions/AppError';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      throw new ValidationError(`${firstIssue.path.join('.')}: ${firstIssue.message}`);
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      throw new ValidationError(`${firstIssue.path.join('.')}: ${firstIssue.message}`);
    }
    // req.query is technically read-only in the Express type, but assigning
    // the parsed/coerced result back is the standard pattern for this
    // middleware and works fine at runtime.
    req.query = result.data as typeof req.query;
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      throw new ValidationError(`${firstIssue.path.join('.')}: ${firstIssue.message}`);
    }
    req.params = result.data as typeof req.params;
    next();
  };
}
