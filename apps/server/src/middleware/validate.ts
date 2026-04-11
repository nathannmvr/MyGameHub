// src/middleware/validate.ts
// Zod validation middleware factory for Express
// Validates request body or query params, strips unknown fields

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import type { ApiError } from "@gamehub/shared";

/**
 * Creates an Express middleware that validates the request body or query
 * against a Zod schema.
 *
 * - On success: replaces req.body/req.query with the parsed (stripped) data
 *   and calls next().
 * - On failure: responds with 400 and ApiError format.
 *
 * @param schema - The Zod schema to validate against
 * @param target - Which part of the request to validate ("body" or "query")
 */
export function validate(
  schema: ZodSchema,
  target: "body" | "query" = "body"
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = target === "body" ? req.body : req.query;
    const result = schema.safeParse(data);

    if (!result.success) {
      const response: ApiError = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
      };
      res.status(400).json(response);
      return;
    }

    // Replace with parsed & stripped data
    if (target === "body") {
      req.body = result.data;
    } else {
      req.query = result.data;
    }

    next();
  };
}
