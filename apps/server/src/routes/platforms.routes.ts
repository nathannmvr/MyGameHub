// src/routes/platforms.routes.ts
// Platform CRUD routes — Stub (501 Not Implemented)
// Implementation: Phase 5

import { Router } from "express";

export const platformsRouter = Router();

// GET /api/v1/platforms — List user's platforms
platformsRouter.get("/", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});

// POST /api/v1/platforms — Create platform
platformsRouter.post("/", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});

// PUT /api/v1/platforms/:id — Update platform
platformsRouter.put("/:id", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});

// DELETE /api/v1/platforms/:id — Delete platform
platformsRouter.delete("/:id", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});
