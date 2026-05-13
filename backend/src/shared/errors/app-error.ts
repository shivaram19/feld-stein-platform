export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly code: string

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest(message: string, code = "BAD_REQUEST") {
    return new AppError(message, 400, code)
  }

  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new AppError(message, 401, code)
  }

  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new AppError(message, 403, code)
  }

  static notFound(message = "Not found", code = "NOT_FOUND") {
    return new AppError(message, 404, code)
  }

  static conflict(message: string, code = "CONFLICT") {
    return new AppError(message, 409, code)
  }

  static validation(message: string, code = "VALIDATION_ERROR") {
    return new AppError(message, 422, code)
  }

  static tooManyRequests(message = "Too many requests", code = "RATE_LIMIT") {
    return new AppError(message, 429, code)
  }

  static internal(message = "Internal server error", code = "INTERNAL_ERROR") {
    return new AppError(message, 500, code)
  }
}
