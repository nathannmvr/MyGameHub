// src/schemas/games.schema.ts
// Zod validation schemas for Game search endpoints
// Derived from: design.md §4.2

import { z } from "zod";

/**
 * GET /api/v1/games/search — Query params for RAWG game search
 */
export const GameSearchQuerySchema = z.object({
  q: z
    .string()
    .min(2, "Search query must be at least 2 characters"),
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(40, "Page size must be at most 40")
    .default(20),
});

/**
 * GET /api/v1/games/:rawgId — Path param validation
 */
export const GameDetailsParamSchema = z.object({
  rawgId: z.coerce
    .number()
    .int()
    .positive("RAWG ID must be a positive integer"),
});

export type GameSearchQueryInput = z.infer<typeof GameSearchQuerySchema>;
export type GameDetailsParamInput = z.infer<typeof GameDetailsParamSchema>;
