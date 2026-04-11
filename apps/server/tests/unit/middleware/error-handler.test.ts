// tests/unit/middleware/error-handler.test.ts
// TDD RED → GREEN: Error handler middleware tests

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { ZodError, z } from "zod";
import { errorHandler, AppError } from "../../../src/middleware/error-handler.js";

// Helper to create mock Express request/response/next
function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockReq(overrides: Partial<Request> = {}) {
  return { method: "GET", path: "/test", ...overrides } as Request;
}

describe("Error Handler Middleware", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = vi.fn();
  });

  it("should return 400 with ApiError format for ZodError (validation)", () => {
    const schema = z.object({ name: z.string().min(1) });
    let zodError: ZodError;
    try {
      schema.parse({ name: "" });
    } catch (e) {
      zodError = e as ZodError;
    }

    errorHandler(zodError!, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "VALIDATION_ERROR",
          message: expect.any(String),
          details: expect.any(Array),
        }),
      })
    );
  });

  it("should return 500 for unhandled errors", () => {
    const error = new Error("Something broke");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        }),
      })
    );
  });

  it("should preserve custom HTTP status and error code from AppError", () => {
    const error = new AppError("PLATFORM_NOT_FOUND", "Platform not found", 404);

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "PLATFORM_NOT_FOUND",
          message: "Platform not found",
        }),
      })
    );
  });

  it("should return 409 for conflict errors", () => {
    const error = new AppError(
      "GAME_ALREADY_IN_LIBRARY",
      "Game already exists in library",
      409
    );

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "GAME_ALREADY_IN_LIBRARY",
          message: "Game already exists in library",
        }),
      })
    );
  });

  it("should not expose internal error messages in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const error = new Error("Sensitive database error details");
    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        }),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });
});
