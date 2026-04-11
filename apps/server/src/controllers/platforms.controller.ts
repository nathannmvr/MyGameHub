// src/controllers/platforms.controller.ts
// Platform CRUD controller — connects routes to PlatformService
// Uses the default user (no auth yet) — will be replaced with auth middleware

import { Request, Response, NextFunction } from "express";
import { PlatformService } from "../services/platform.service.js";
import { getPrismaClient } from "../config/database.js";

// Singleton service instance
let platformService: PlatformService | null = null;

function getService(): PlatformService {
  if (!platformService) {
    platformService = new PlatformService(getPrismaClient());
  }
  return platformService;
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
    // Auto-create a default user if none exists
    const newUser = await prisma.user.create({
      data: { username: "default_user" },
    });
    return newUser.id;
  }
  return user.id;
}

// GET /api/v1/platforms
export async function listPlatforms(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const platforms = await getService().listByUser(userId);
    res.json({ success: true, data: platforms });
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/platforms
export async function createPlatform(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const platform = await getService().create(userId, req.body);
    res.status(201).json({ success: true, data: platform });
  } catch (error) {
    next(error);
  }
}

// PUT /api/v1/platforms/:id
export async function updatePlatform(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const platform = await getService().update(userId, req.params.id, req.body);
    res.json({ success: true, data: platform });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/v1/platforms/:id
export async function deletePlatform(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const result = await getService().delete(userId, req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
