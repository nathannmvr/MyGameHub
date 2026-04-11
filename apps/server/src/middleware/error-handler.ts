// src/middleware/error-handler.ts
// Centralized error handling middleware for Express
// Handles AppError (custom), ZodError (validation), and unknown errors

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { ApiError } from "@gamehub/shared";

/**
 * Custom application error with semantic code and HTTP status.
 * Used across services to throw typed, structured errors.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Express error-handling middleware.
 * Must be registered AFTER all routes.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ─── Zod Validation Error ───
  if (err instanceof ZodError) {
    const response: ApiError = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
    };
    res.status(400).json(response);
    return;
  }

  // ─── Custom Application Error ───
  if (err instanceof AppError) {
    const response: ApiError = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // ─── Unhandled / Unknown Error ───
  // Never expose internal error details in production
  if (process.env.NODE_ENV !== "production") {
    console.error("🔥 Unhandled error:", err);
  }

  const response: ApiError = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  };
  res.status(500).json(response);
}
