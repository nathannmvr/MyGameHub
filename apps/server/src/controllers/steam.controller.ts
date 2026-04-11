// src/controllers/steam.controller.ts
// Steam sync controller: starts sync jobs and reports progress.

import { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../config/database.js";
import { AppError } from "../middleware/error-handler.js";
import { enqueueSteamSyncJob } from "../jobs/queue.js";
import { SteamSyncStatusParamSchema } from "../schemas/index.js";

async function getCurrentUserId(): Promise<string> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findFirst();

  if (!user) {
    const created = await prisma.user.create({
      data: { username: "default_user" },
    });
    return created.id;
  }

  return user.id;
}

// POST /api/v1/steam/sync
export async function startSteamSync(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const { steamId, platformId } = req.body as {
      steamId: string;
      platformId: string;
    };

    const existingRunning = await getPrismaClient().syncJob.findFirst({
      where: {
        userId,
        type: "STEAM",
        status: "RUNNING",
      },
    });

    if (existingRunning) {
      throw new AppError(
        "STEAM_SYNC_ALREADY_RUNNING",
        "A Steam sync job is already running for this user",
        409
      );
    }

    const syncJob = await getPrismaClient().syncJob.create({
      data: {
        userId,
        type: "STEAM",
        status: "PENDING",
      },
    });

    await enqueueSteamSyncJob({
      syncJobId: syncJob.id,
      userId,
      steamId,
      platformId,
    });

    res.status(202).json({
      success: true,
      data: {
        jobId: syncJob.id,
        status: syncJob.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/steam/sync/:jobId
export async function getSteamSyncStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const { jobId } = SteamSyncStatusParamSchema.parse(req.params);

    const syncJob = await getPrismaClient().syncJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!syncJob) {
      throw new AppError("SYNC_JOB_NOT_FOUND", "Sync job not found", 404);
    }

    res.json({
      success: true,
      data: syncJob,
    });
  } catch (error) {
    next(error);
  }
}