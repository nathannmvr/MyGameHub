// src/routes/library.routes.ts
// Library CRUD routes — wired to controller with Zod validation
// Ref: design.md §4.2, spec.md §3.2

import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  AddToLibrarySchema,
  UpdateLibraryItemSchema,
  LibraryQuerySchema,
} from "../schemas/index.js";
import {
  listLibrary,
  addToLibrary,
  updateLibraryItem,
  deleteLibraryItem,
} from "../controllers/library.controller.js";

export const libraryRouter: ReturnType<typeof Router> = Router();

// GET /api/v1/library — List library items (with filters, sorting, pagination)
libraryRouter.get("/", validate(LibraryQuerySchema, "query"), listLibrary);

// POST /api/v1/library — Add game to library (with validation)
libraryRouter.post("/", validate(AddToLibrarySchema), addToLibrary);

// PUT /api/v1/library/:id — Update library item (with validation)
libraryRouter.put("/:id", validate(UpdateLibraryItemSchema), updateLibraryItem);

// DELETE /api/v1/library/:id — Remove game from library
libraryRouter.delete("/:id", deleteLibraryItem);
