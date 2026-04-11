// src/schemas/platform.schema.ts
// Zod validation schemas for Platform endpoints
// Derived from: spec.md §3.1, design.md §4.2

import { z } from "zod";

/**
 * POST /api/v1/platforms — Create a new platform
 * Validation rules:
 * - name: required, 1-50 characters
 * - manufacturer: required, 1-50 characters
 * - icon: optional, defaults to "gamepad"
 */
export const CreatePlatformSchema = z.object({
  name: z
    .string()
    .min(1, "Platform name is required")
    .max(50, "Platform name must be at most 50 characters")
    .trim(),
  manufacturer: z
    .string()
    .min(1, "Manufacturer is required")
    .max(50, "Manufacturer must be at most 50 characters")
    .trim(),
  icon: z.string().trim().default("gamepad"),
});

/**
 * PUT /api/v1/platforms/:id — Update a platform
 * All fields are optional (partial update)
 */
export const UpdatePlatformSchema = z.object({
  name: z
    .string()
    .min(1, "Platform name cannot be empty")
    .max(50, "Platform name must be at most 50 characters")
    .trim()
    .optional(),
  manufacturer: z
    .string()
    .min(1, "Manufacturer cannot be empty")
    .max(50, "Manufacturer must be at most 50 characters")
    .trim()
    .optional(),
  icon: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export type CreatePlatformInput = z.infer<typeof CreatePlatformSchema>;
export type UpdatePlatformInput = z.infer<typeof UpdatePlatformSchema>;
