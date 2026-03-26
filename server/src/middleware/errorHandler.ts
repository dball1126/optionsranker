import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { ApiError } from '@optionsranker/shared';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || 'body';
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }

    const response: ApiError = {
      success: false,
      error: 'Validation failed',
      details,
    };

    res.status(400).json(response);
    return;
  }

  // Custom application errors
  if (err instanceof AppError) {
    const response: ApiError = {
      success: false,
      error: err.message,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown errors
  logger.error('Unhandled error:', err);

  const response: ApiError = {
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  };

  res.status(500).json(response);
}
