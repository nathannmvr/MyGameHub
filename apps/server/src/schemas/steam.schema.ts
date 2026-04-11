// src/schemas/steam.schema.ts
// Zod validation schemas for Steam sync endpoints
// Derived from: spec.md §3.3, design.md §4.2

import { z } from "zod";

/**
 * POST /api/v1/steam/sync — Start Steam sync job
 * Validates Steam ID format and platform reference
 */
export const SteamSyncSchema = z.object({
  steamId: z
    .string()
    .min(1, "Steam ID is required")
    .regex(/^\d{17}$/, "Steam ID must be a 17-digit number"),
  platformId: z
    .string()
    .min(1, "Platform ID is required"),
});

/**
 * GET /api/v1/steam/sync/:jobId — Path param validation
 */
export const SteamSyncStatusParamSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
});

export type SteamSyncInput = z.infer<typeof SteamSyncSchema>;
export type SteamSyncStatusParamInput = z.infer<typeof SteamSyncStatusParamSchema>;
