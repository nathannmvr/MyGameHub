// src/routes/steam.routes.ts
// Steam sync routes — Stub (501 Not Implemented)
// Implementation: Phase 7

import { Router } from "express";

export const steamRouter = Router();

// POST /api/v1/steam/sync — Start Steam sync job
steamRouter.post("/sync", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});

// GET /api/v1/steam/sync/:jobId — Poll sync job status
steamRouter.get("/sync/:jobId", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});
