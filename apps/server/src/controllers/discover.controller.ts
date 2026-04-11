// src/controllers/discover.controller.ts
// Discover controller for recommendation endpoint.

import { Request, Response, NextFunction } from "express";
import type { RecommendationFeedbackDTO, RecommendationProfile } from "@gamehub/shared";
import { getPrismaClient } from "../config/database.js";
import { RecommendationService } from "../services/recommendation.service.js";
import { RawgService } from "../services/rawg.service.js";
import { CacheService } from "../services/cache.service.js";
import { getAuthContext } from "../middleware/auth.js";

let recommendationService: RecommendationService | null = null;

function getService(): RecommendationService {
  if (!recommendationService) {
    recommendationService = new RecommendationService({
      prisma: getPrismaClient(),
      rawgService: new RawgService(),
      cache: new CacheService({ defaultTtlSeconds: 3600 }),
    });
  }

  return recommendationService;
}

// GET /api/v1/discover
export async function getRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuthContext(req);
    const { page, pageSize, profile, experimentGroup, fallbackToTrending } = req.query as unknown as {
      page: number;
      pageSize: number;
      profile: RecommendationProfile;
      experimentGroup?: "control" | "treatment";
      fallbackToTrending?: boolean;
    };

    const recommendations = await getService().getRecommendations(userId, {
      page,
      pageSize,
      profile,
      experimentGroup,
      fallbackToTrending,
    });

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/discover/feedback
export async function submitRecommendationFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuthContext(req);
    const payload = req.body as RecommendationFeedbackDTO;

    await getService().submitFeedback(userId, payload);

    const isDismissive = payload.eventType === undefined || payload.eventType === "DISMISS" || payload.eventType === "HIDE";

    res.status(201).json({
      success: true,
      data: {
        dismissed: isDismissive,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/discover/metrics
export async function getRecommendationMetrics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate, experimentGroup, k } = req.query as {
      startDate?: string;
      endDate?: string;
      experimentGroup?: "control" | "treatment";
      k?: string;
    };

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;
    const topK = k ? Number(k) : 10;

    const metrics = await getService().getExperimentMetrics({
      startDate: start,
      endDate: end,
      experimentGroup,
      k: topK,
    });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
}