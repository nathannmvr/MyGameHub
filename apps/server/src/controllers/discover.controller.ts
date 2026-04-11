// src/controllers/discover.controller.ts
// Discover controller for recommendation endpoint.

import { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../config/database.js";
import { RecommendationService } from "../services/recommendation.service.js";
import { RawgService } from "../services/rawg.service.js";
import { CacheService } from "../services/cache.service.js";

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

// GET /api/v1/discover
export async function getRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };

    const recommendations = await getService().getRecommendations(userId, {
      page,
      pageSize,
    });

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
}