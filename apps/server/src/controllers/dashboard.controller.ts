// src/controllers/dashboard.controller.ts
// Dashboard controller — connects routes to DashboardService
// Uses the default user (no auth yet) — will be replaced with auth middleware

import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard.service.js";
import { getPrismaClient } from "../config/database.js";
import { getAuthContext } from "../middleware/auth.js";

// Singleton service instance
let dashboardService: DashboardService | null = null;

function getService(): DashboardService {
  if (!dashboardService) {
    dashboardService = new DashboardService(getPrismaClient());
  }
  return dashboardService;
}

// GET /api/v1/dashboard/stats
export async function getDashboardStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuthContext(req);
    const stats = await getService().getStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}
