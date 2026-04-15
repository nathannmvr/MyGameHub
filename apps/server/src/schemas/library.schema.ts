// src/schemas/library.schema.ts
// Zod validation schemas for Library endpoints
// Derived from: spec.md §3.2, design.md §4.2

import { z } from "zod";
import { GameStatus } from "@gamehub/shared";

/**
 * POST /api/v1/library — Add game to library
 * The frontend identifies a game by its RAWG ID
 */
export const AddToLibrarySchema = z.object({
  rawgId: z
    .number()
    .int("RAWG ID must be an integer")
    .positive("RAWG ID must be positive")
    .optional(),
  title: z
    .string()
    .min(1, "Title must not be empty")
    .max(200, "Title must be at most 200 characters")
    .optional(),
  coverUrl: z
    .string()
    .url("Cover URL must be a valid URL")
    .max(2000, "Cover URL must be at most 2000 characters")
    .optional(),
  platformId: z
    .string()
    .min(1, "Platform ID is required"),
  status: z.nativeEnum(GameStatus, {
    errorMap: () => ({ message: `Status must be one of: ${Object.values(GameStatus).join(", ")}` }),
  }),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be between 1 and 10")
    .max(10, "Rating must be between 1 and 10")
    .nullable()
    .optional(),
  playtimeHours: z
    .number()
    .min(0, "Playtime must be non-negative")
    .nullable()
    .optional(),
  review: z
    .string()
    .max(5000, "Review must be at most 5000 characters")
    .nullable()
    .optional(),
}).superRefine((data, ctx) => {
  if (data.rawgId === undefined && (typeof data.title !== 'string' || !data.title.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide rawgId or title to add a game",
      path: ["title"],
    });
  }
});

/**
 * PUT /api/v1/library/:id — Update library item
 * All fields optional (partial update)
 */
export const UpdateLibraryItemSchema = z.object({
  platformId: z.string().min(1).optional(),
  status: z.nativeEnum(GameStatus).optional(),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be between 1 and 10")
    .max(10, "Rating must be between 1 and 10")
    .nullable()
    .optional(),
  playtimeHours: z
    .number()
    .min(0, "Playtime must be non-negative")
    .nullable()
    .optional(),
  review: z
    .string()
    .max(5000, "Review must be at most 5000 characters")
    .nullable()
    .optional(),
});

/**
 * GET /api/v1/library — Query params for library listing
 */
export const LibraryQuerySchema = z.object({
  status: z.nativeEnum(GameStatus).optional(),
  platformId: z.string().optional(),
  sort: z
    .enum(["name", "rating", "playtime", "added"])
    .default("added"),
  order: z
    .enum(["asc", "desc"])
    .default("desc"),
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100, "Page size must be at most 100")
    .default(24),
  search: z
    .string()
    .min(1)
    .optional(),
});

export type AddToLibraryInput = z.infer<typeof AddToLibrarySchema>;
export type UpdateLibraryItemInput = z.infer<typeof UpdateLibraryItemSchema>;
export type LibraryQueryInput = z.infer<typeof LibraryQuerySchema>;
