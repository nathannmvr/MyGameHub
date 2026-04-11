// src/routes/discover.routes.ts
// Discovery/recommendation routes — Stub (501 Not Implemented)
// Implementation: Phase 8

import { Router } from "express";

export const discoverRouter = Router();

// GET /api/v1/discover — Get recommendations
discoverRouter.get("/", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});
