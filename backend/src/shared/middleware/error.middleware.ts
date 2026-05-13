import { Request, Response, NextFunction } from "express"
import { AppError } from "../errors/app-error"
import { env } from "../../config/env"

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    })
  }

  console.error("Unhandled error:", err)

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: env.NODE_ENV === "production" ? "Something went wrong" : err.message,
    },
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Resource not found",
    },
  })
}
