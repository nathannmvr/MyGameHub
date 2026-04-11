// src/routes/library.routes.ts
// Library CRUD routes — Stub (501 Not Implemented)
// Implementation: Phase 5

import { Router } from "express";

export const libraryRouter = Router();

// GET /api/v1/library — List library items (with filters)
libraryRouter.get("/", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});

// POST /api/v1/library — Add game to library
libraryRouter.post("/", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});

// PUT /api/v1/library/:id — Update library item
libraryRouter.put("/:id", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});

// DELETE /api/v1/library/:id — Remove game from library
libraryRouter.delete("/:id", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});
