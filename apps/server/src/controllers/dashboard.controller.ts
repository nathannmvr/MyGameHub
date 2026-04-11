// src/controllers/dashboard.controller.ts
// Dashboard controller — connects routes to DashboardService
// Uses the default user (no auth yet) — will be replaced with auth middleware

import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard.service.js";
import { getPrismaClient } from "../config/database.js";

// Singleton service instance
let dashboardService: DashboardService | null = null;

function getService(): DashboardService {
  if (!dashboardService) {
    dashboardService = new DashboardService(getPrismaClient());
  }
  return dashboardService;
}

/**
 * Temporary helper to get the current user ID.
 * Since there's no auth yet, uses the first user in the database.
 * In production, this will come from auth middleware (req.user.id).
 */
async function getCurrentUserId(): Promise<string> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findFirst();
  if (!user) {
    const newUser = await prisma.user.create({
      data: { username: "default_user" },
    });
    return newUser.id;
  }
  return user.id;
}

// GET /api/v1/dashboard/stats
export async function getDashboardStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const stats = await getService().getStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}
