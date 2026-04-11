// src/controllers/games.controller.ts
// Games controller for RAWG search and details endpoints.

import { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../config/database.js";
import { RawgService } from "../services/rawg.service.js";
import { CacheService } from "../services/cache.service.js";
import { GameDetailsParamSchema } from "../schemas/index.js";

let rawgService: RawgService | null = null;

function getRawgService(): RawgService {
  if (!rawgService) {
    rawgService = new RawgService({
      cache: new CacheService(),
    });
  }

  return rawgService;
}

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

// GET /api/v1/games/search
export async function searchGames(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const { q, page, pageSize } = req.query as {
      q: string;
      page: number;
      pageSize: number;
    };

    const searchResult = await getRawgService().searchGames(q, page, pageSize);
    const rawgIds = searchResult.items.map((item) => item.rawgId);

    const userGames = await getPrismaClient().userGame.findMany({
      where: {
        userId,
        game: {
          rawgId: {
            in: rawgIds,
          },
        },
      },
      select: {
        game: {
          select: {
            rawgId: true,
          },
        },
      },
    });

    const inLibraryIds = new Set(
      userGames.map((item) => item.game.rawgId).filter((id): id is number => id !== null)
    );

    const enriched = searchResult.items.map((item) => ({
      ...item,
      alreadyInLibrary: inLibraryIds.has(item.rawgId),
    }));

    res.json({
      success: true,
      data: {
        data: enriched,
        pagination: searchResult.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/games/:rawgId
export async function getGameDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { rawgId } = GameDetailsParamSchema.parse(req.params);
    const details = await getRawgService().getGameDetails(rawgId);

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
}