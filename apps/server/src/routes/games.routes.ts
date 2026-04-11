// src/routes/games.routes.ts
// Game search routes (RAWG) — Stub (501 Not Implemented)
// Implementation: Phase 6

import { Router } from "express";

export const gamesRouter = Router();

// GET /api/v1/games/search?q= — Search games via RAWG
gamesRouter.get("/search", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});

// GET /api/v1/games/:rawgId — Game details from RAWG
gamesRouter.get("/:rawgId", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});
