// src/controllers/steam.controller.ts
// Steam sync controller: starts sync jobs and reports progress.

import { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../config/database.js";
import { AppError } from "../middleware/error-handler.js";
import { enqueueSteamSyncJob } from "../jobs/queue.js";
import { SteamSyncStatusParamSchema } from "../schemas/index.js";
import { SteamSyncWorkerService } from "../jobs/steam-sync.worker.js";
import { getAuthContext } from "../middleware/auth.js";

let inlineSteamSyncWorker: SteamSyncWorkerService | null = null;

function getInlineSteamSyncWorker() {
  if (!inlineSteamSyncWorker) {
    inlineSteamSyncWorker = new SteamSyncWorkerService();
  }

  return inlineSteamSyncWorker;
}

function isQueueUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("redis") || message.includes("econnrefused") || message.includes("connect");
}

async function enqueueWithFallback(data: {
  syncJobId: string;
  userId: string;
  steamId: string;
  platformId: string;
}) {
  if (process.env.NODE_ENV !== "production") {
    setTimeout(() => {
      getInlineSteamSyncWorker().processSyncJob(data).catch(() => {
        // The worker service already persists FAILED status in the sync job.
      });
    }, 0);

    return;
  }

  try {
    await Promise.race([
      enqueueSteamSyncJob(data),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Queue timeout while connecting to Redis"));
        }, 2000);
      }),
    ]);
    return;
  } catch (error) {
    if (!isQueueUnavailable(error)) {
      throw error;
    }
  }

  // Local/dev fallback: run sync without BullMQ when Redis is not reachable.
  setTimeout(() => {
    getInlineSteamSyncWorker().processSyncJob(data).catch(() => {
      // The worker service already persists FAILED status in the sync job.
    });
  }, 0);
}

// POST /api/v1/steam/sync
export async function startSteamSync(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuthContext(req);
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

    await enqueueWithFallback({
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
    const { userId } = getAuthContext(req);
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