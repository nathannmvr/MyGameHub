// src/controllers/platforms.controller.ts
// Platform CRUD controller — connects routes to PlatformService
// Uses the default user (no auth yet) — will be replaced with auth middleware

import { Request, Response, NextFunction } from "express";
import { PlatformService } from "../services/platform.service.js";
import { getPrismaClient } from "../config/database.js";
import { getAuthContext } from "../middleware/auth.js";

// Singleton service instance
let platformService: PlatformService | null = null;

function getService(): PlatformService {
  if (!platformService) {
    platformService = new PlatformService(getPrismaClient());
  }
  return platformService;
}

// GET /api/v1/platforms
export async function listPlatforms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuthContext(req);
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
    const { userId } = getAuthContext(req);
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
    const { userId } = getAuthContext(req);
    const platform = await getService().update(userId, String(req.params.id), req.body);
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
    const { userId } = getAuthContext(req);
    const result = await getService().delete(userId, String(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
