// tests/unit/middleware/validate.test.ts
// TDD RED → GREEN: Zod validation middleware tests

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../../src/middleware/validate.js";

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("Validate Middleware", () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    res = createMockRes();
    next = vi.fn();
  });

  const testSchema = z.object({
    name: z.string().min(1, "Name is required"),
    manufacturer: z.string().min(1, "Manufacturer is required"),
  });

  it("should call next() when body is valid", () => {
    const req = {
      body: { name: "PlayStation 5", manufacturer: "Sony" },
    } as Request;

    const middleware = validate(testSchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // called without error
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 400 with Zod details when body is invalid", () => {
    const req = {
      body: { name: "", manufacturer: "" },
    } as Request;

    const middleware = validate(testSchema);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "VALIDATION_ERROR",
          message: expect.any(String),
          details: expect.arrayContaining([
            expect.objectContaining({
              path: expect.any(Array),
              message: expect.any(String),
            }),
          ]),
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should strip unknown fields from body after validation", () => {
    const req = {
      body: { name: "PC", manufacturer: "Custom", extraField: "should be removed" },
    } as Request;

    const middleware = validate(testSchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ name: "PC", manufacturer: "Custom" });
    expect(req.body.extraField).toBeUndefined();
  });

  it("should validate query params when target is 'query'", () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().default(24),
    });

    const req = {
      query: { page: "2", pageSize: "10" },
    } as unknown as Request;

    const middleware = validate(querySchema, "query");
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.query).toEqual({ page: 2, pageSize: 10 });
  });

  it("should return 400 for invalid query params", () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive(),
    });

    const req = {
      query: { page: "abc" },
    } as unknown as Request;

    const middleware = validate(querySchema, "query");
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
