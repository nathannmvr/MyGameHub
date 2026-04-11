// src/controllers/library.controller.ts
// Library CRUD controller — connects routes to LibraryService
// Uses the default user (no auth yet) — will be replaced with auth middleware

import { Request, Response, NextFunction } from "express";
import { LibraryService } from "../services/library.service.js";
import { getPrismaClient } from "../config/database.js";
import { RawgService } from "../services/rawg.service.js";
import { CacheService } from "../services/cache.service.js";
import { AppError } from "../middleware/error-handler.js";
import { getAuthContext } from "../middleware/auth.js";

// Singleton service instance
let libraryService: LibraryService | null = null;
let rawgService: RawgService | null = null;

function getService(): LibraryService {
  if (!libraryService) {
    libraryService = new LibraryService(getPrismaClient());
  }
  return libraryService;
}

function getRawgService(): RawgService {
  if (!rawgService) {
    rawgService = new RawgService({ cache: new CacheService() });
  }

  return rawgService;
}

async function ensureGameInCatalog(rawgId: number): Promise<void> {
  const prisma = getPrismaClient();

  const existing = await prisma.game.findUnique({
    where: { rawgId },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  try {
    const details = await getRawgService().getGameDetails(rawgId);

    await prisma.game.upsert({
      where: { rawgId },
      create: {
        rawgId: details.rawgId,
        rawgSlug: details.slug,
        title: details.title,
        coverUrl: details.coverUrl,
        backgroundUrl: details.backgroundUrl,
        releaseDate: details.releaseDate ? new Date(details.releaseDate) : null,
        description: details.description,
        metacritic: details.metacritic,
        developer: details.developer,
        publisher: details.publisher,
        genres: details.genres,
        tags: details.tags,
        platforms: details.platforms,
      },
      update: {
        rawgSlug: details.slug,
        title: details.title,
        coverUrl: details.coverUrl,
        backgroundUrl: details.backgroundUrl,
        releaseDate: details.releaseDate ? new Date(details.releaseDate) : null,
        description: details.description,
        metacritic: details.metacritic,
        developer: details.developer,
        publisher: details.publisher,
        genres: details.genres,
        tags: details.tags,
        platforms: details.platforms,
      },
    });
  } catch {
    throw new AppError(
      "GAME_NOT_FOUND",
      `Game with RAWG ID ${rawgId} not found in local catalog or RAWG API`,
      404
    );
  }
}

// GET /api/v1/library
export async function listLibrary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuthContext(req);
    const result = await getService().list(userId, req.query as any);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/library
export async function addToLibrary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuthContext(req);
    const payload = req.body as {
      rawgId?: number;
      title?: string;
      coverUrl?: string;
      platformId: string;
      status: string;
      rating?: number | null;
      playtimeHours?: number | null;
      review?: string | null;
    };

    if (payload.rawgId !== undefined) {
      try {
        await ensureGameInCatalog(payload.rawgId);
      } catch {
        if (!payload.title?.trim()) {
          throw new AppError(
            "GAME_NOT_FOUND",
            `Game with RAWG ID ${payload.rawgId} not found in local catalog or RAWG API`,
            404
          );
        }
      }
    }

    const item = await getService().addGame(userId, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

// PUT /api/v1/library/:id
export async function updateLibraryItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuthContext(req);
    const item = await getService().update(userId, String(req.params.id), req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/v1/library/:id
export async function deleteLibraryItem(
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
