// src/controllers/games.controller.ts
// Games controller for RAWG search and details endpoints.

import { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../config/database.js";
import { RawgService } from "../services/rawg.service.js";
import { CacheService } from "../services/cache.service.js";
import { GameDetailsParamSchema } from "../schemas/index.js";
import { AppError } from "../middleware/error-handler.js";

let rawgService: RawgService | null = null;

function getRawgService(): RawgService {
  if (!rawgService) {
    rawgService = new RawgService({
      cache: new CacheService(),
    });
  }

  return rawgService;
}

async function searchGamesLocal(query: string, page: number, pageSize: number) {
  const normalizedQuery = query.trim();

  const whereClause = {
    title: {
      contains: normalizedQuery,
      mode: "insensitive" as const,
    },
    rawgId: { not: null },
  };

  const prisma = getPrismaClient();
  const [games, totalItems] = await Promise.all([
    prisma.game.findMany({
      where: whereClause,
      orderBy: { title: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.game.count({ where: whereClause }),
  ]);

  return {
    items: games.map((game) => ({
      rawgId: game.rawgId as number,
      slug: game.rawgSlug ?? `game-${game.rawgId}`,
      title: game.title,
      coverUrl: game.coverUrl,
      releaseDate: game.releaseDate ? game.releaseDate.toISOString().slice(0, 10) : null,
      genres: game.genres,
      platforms: game.platforms,
      metacritic: game.metacritic,
    })),
    pagination: {
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
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

    let searchResult;

    try {
      searchResult = await getRawgService().searchGames(q, page, pageSize);
    } catch {
      searchResult = await searchGamesLocal(q, page, pageSize);
    }

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
    let details;

    try {
      details = await getRawgService().getGameDetails(rawgId);
    } catch {
      const local = await getPrismaClient().game.findFirst({ where: { rawgId } });

      if (!local) {
        throw new AppError("GAME_NOT_FOUND", "Game not found in local catalog", 404);
      }

      details = {
        rawgId,
        slug: local.rawgSlug ?? `game-${rawgId}`,
        title: local.title,
        coverUrl: local.coverUrl,
        backgroundUrl: local.backgroundUrl,
        releaseDate: local.releaseDate ? local.releaseDate.toISOString().slice(0, 10) : null,
        description: local.description,
        metacritic: local.metacritic,
        developer: local.developer,
        publisher: local.publisher,
        genres: local.genres,
        tags: local.tags,
        platforms: local.platforms,
      };
    }

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
}