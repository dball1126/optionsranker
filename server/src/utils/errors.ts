export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(message, 404);
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(message, 401);
}

export function badRequest(message = 'Bad request'): AppError {
  return new AppError(message, 400);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(message, 403);
}
