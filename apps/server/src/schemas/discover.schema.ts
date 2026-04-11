// src/schemas/discover.schema.ts
// Zod validation schemas for Discover/Recommendation endpoints
// Derived from: design.md §4.2

import { z } from "zod";

const RecommendationProfileSchema = z.enum(["conservative", "exploratory"]);

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
  profile: RecommendationProfileSchema.default("conservative"),
  experimentGroup: z.enum(["control", "treatment"]).optional(), // A/B testing (16.6)
});

/**
 * POST /api/v1/discover/feedback — mark recommendation as not interesting
 */
export const RecommendationFeedbackSchema = z.object({
  rawgId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200).optional(),
  genres: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  reason: z.string().trim().max(500).optional(),
});

export type DiscoverQueryInput = z.infer<typeof DiscoverQuerySchema>;
export type RecommendationFeedbackInput = z.infer<typeof RecommendationFeedbackSchema>;
