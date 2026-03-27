import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

/**
 * Enhanced error handler for production
 */
export function productionErrorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Set default error values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  if (config.NODE_ENV === 'production') {
    // Production error response - don't leak sensitive details
    if (err.isOperational) {
      // Operational errors that we trust to show to client
      return res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
      });
    }
    
    // Programming or other unknown errors - generic response
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong! Please try again later.',
    });
  }
  
  // Development error response - show all details
  return res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
}

/**
 * Handle unhandled routes
 */
export function notFoundHandler(req: Request, res: Response) {
  const message = `Can't find ${req.originalUrl} on this server!`;
  
  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    success: false,
    status: 'fail',
    message,
  });
}

/**
 * Create operational error
 */
export function createOperationalError(message: string, statusCode = 400): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.status = statusCode < 500 ? 'fail' : 'error';
  error.isOperational = true;
  return error;
}

/**
 * Async error handler wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Rate limiting error handler
 */
export function rateLimitHandler(req: Request, res: Response) {
  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    url: req.url,
    userAgent: req.get('User-Agent'),
  });

  res.status(429).json({
    success: false,
    status: 'error',
    message: 'Too many requests, please try again later.',
    retryAfter: '1 minute',
  });
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(server: any) {
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    
    server.close(() => {
      logger.info('Process terminated gracefully');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    server.close(() => {
      process.exit(1);
    });
  });
}