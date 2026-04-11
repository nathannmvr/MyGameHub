// src/controllers/games.controller.ts
// Games controller for RAWG search and details endpoints.

import { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../config/database.js";
import { RawgService } from "../services/rawg.service.js";
import { IgdbService, type IgdbSearchItem } from "../services/igdb.service.js";
import { CacheService } from "../services/cache.service.js";
import { GameDetailsParamSchema } from "../schemas/index.js";
import { AppError } from "../middleware/error-handler.js";
import { getAuthContext } from "../middleware/auth.js";

let rawgService: RawgService | null = null;
let igdbService: IgdbService | null = null;

function mapCatalogGame(game: {
  rawgId: number | null;
  rawgSlug: string | null;
  title: string;
  coverUrl: string | null;
  releaseDate: Date | null;
  genres: string[];
  platforms: string[];
  metacritic: number | null;
}) {
  return {
    rawgId: game.rawgId as number,
    slug: game.rawgSlug ?? `game-${game.rawgId}`,
    title: game.title,
    coverUrl: game.coverUrl,
    releaseDate: game.releaseDate ? game.releaseDate.toISOString().slice(0, 10) : null,
    genres: game.genres,
    platforms: game.platforms,
    metacritic: game.metacritic,
  };
}

function getRawgService(): RawgService {
  if (!rawgService) {
    rawgService = new RawgService({
      cache: new CacheService(),
    });
  }

  return rawgService;
}

function getIgdbService(): IgdbService {
  if (!igdbService) {
    igdbService = new IgdbService({
      cache: new CacheService(),
    });
  }

  return igdbService;
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
    items: games.map(mapCatalogGame),
    pagination: {
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

async function persistSearchResults(items: Array<{
  rawgId: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  releaseDate: string | null;
  genres: string[];
  platforms: string[];
  metacritic: number | null;
}>) {
  const prisma = getPrismaClient();

  await Promise.all(
    items.map((item) =>
      prisma.game.upsert({
        where: { rawgId: item.rawgId },
        create: {
          rawgId: item.rawgId,
          rawgSlug: item.slug,
          title: item.title,
          coverUrl: item.coverUrl,
          releaseDate: item.releaseDate ? new Date(item.releaseDate) : null,
          genres: item.genres,
          platforms: item.platforms,
          metacritic: item.metacritic,
        },
        update: {
          rawgSlug: item.slug,
          title: item.title,
          coverUrl: item.coverUrl,
          releaseDate: item.releaseDate ? new Date(item.releaseDate) : null,
          genres: item.genres,
          platforms: item.platforms,
          metacritic: item.metacritic,
        },
      })
    )
  );
}

async function resolveIgdbCandidatesToRawg(items: IgdbSearchItem[]) {
  const resolved: Array<{
    rawgId: number;
    slug: string;
    title: string;
    coverUrl: string | null;
    releaseDate: string | null;
    genres: string[];
    platforms: string[];
    metacritic: number | null;
  }> = [];

  const seenRawgIds = new Set<number>();
  const maxCandidates = 8;

  for (const item of items.slice(0, maxCandidates)) {
    try {
      const matches = await getRawgService().searchGames(item.title, 1, 5);
      const exactMatch = matches.items.find(
        (candidate) => candidate.title.toLowerCase() === item.title.toLowerCase()
      );
      const selected = exactMatch ?? matches.items[0];

      if (!selected || seenRawgIds.has(selected.rawgId)) {
        continue;
      }

      seenRawgIds.add(selected.rawgId);
      resolved.push(selected);
    } catch {
      // Continue resolving other IGDB candidates if one lookup fails.
    }
  }

  return resolved;
}

// GET /api/v1/games/search
export async function searchGames(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuthContext(req);
    const { q, page, pageSize } = req.query as unknown as {
      q: string;
      page: number;
      pageSize: number;
    };

    let searchResult;

    try {
      searchResult = await getRawgService().searchGames(q, page, pageSize);
      if (searchResult.items.length > 0) {
        try {
          await persistSearchResults(searchResult.items);
        } catch {
          // Persistence issues must not hide successful RAWG responses from the client.
        }
      }
    } catch {
      // Try IGDB/local fallback below.
    }

    if (!searchResult || searchResult.items.length === 0) {
      const igdb = getIgdbService();

      if (igdb.isConfigured()) {
        try {
          const igdbResult = await igdb.searchGames(q, page, pageSize);
          const resolvedItems = await resolveIgdbCandidatesToRawg(igdbResult.items);

          if (resolvedItems.length > 0) {
            searchResult = {
              items: resolvedItems,
              pagination: {
                totalItems: resolvedItems.length,
                page,
                pageSize,
                totalPages: igdbResult.pagination.totalPages,
              },
            };

            try {
              await persistSearchResults(resolvedItems);
            } catch {
              // Persistence issues must not hide successful IGDB+RAWG responses from the client.
            }
          }
        } catch {
          // Fallback to local search below.
        }
      }
    }

    if (!searchResult || searchResult.items.length === 0) {
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