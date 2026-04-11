// src/schemas/discover.schema.ts
// Zod validation schemas for Discover/Recommendation endpoints
// Derived from: design.md §4.2

import { z } from "zod";

/**
 * GET /api/v1/discover — Query params for recommendation listing
 */
export const DiscoverQuerySchema = z.object({
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

export type DiscoverQueryInput = z.infer<typeof DiscoverQuerySchema>;
