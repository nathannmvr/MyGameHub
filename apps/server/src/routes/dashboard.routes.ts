// src/routes/dashboard.routes.ts
// Dashboard stats routes — Stub (501 Not Implemented)
// Implementation: Phase 5

import { Router } from "express";

export const dashboardRouter = Router();

// GET /api/v1/dashboard/stats — Dashboard statistics
dashboardRouter.get("/stats", (_req, res) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Not implemented" } });
});
