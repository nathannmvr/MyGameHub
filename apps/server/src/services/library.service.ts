// src/services/library.service.ts
// Library CRUD service with business rule enforcement
// RN-04: One game per user (no duplicate UserGame for same user+game)
// RN-05: platformId must exist and be active

import { PrismaClient, Prisma } from "@prisma/client";
import { AppError } from "../middleware/error-handler.js";

export interface AddGameData {
  rawgId: number;
  platformId: string;
  status: string;
  rating?: number | null;
  playtimeHours?: number | null;
  review?: string | null;
}

export interface UpdateGameData {
  platformId?: string;
  status?: string;
  rating?: number | null;
  playtimeHours?: number | null;
  review?: string | null;
}

export interface ListOptions {
  status?: string;
  platformId?: string;
  sort: "name" | "rating" | "playtime" | "added";
  order: "asc" | "desc";
  page: number;
  pageSize: number;
  search?: string;
}

export class LibraryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Add a game to the user's library.
   * Finds the Game by rawgId, validates platform, and creates UserGame.
   * Throws GAME_NOT_FOUND if no game matches the rawgId.
   * Throws PLATFORM_NOT_FOUND (404) if platformId doesn't exist → RN-05.
   * Throws PLATFORM_NOT_ACTIVE (409) if platform is inactive → RN-05.
   * Throws GAME_ALREADY_IN_LIBRARY (409) if user already has this game → RN-04.
   */
  async addGame(userId: string, data: AddGameData) {
    // 1. Find game by rawgId
    const game = await this.prisma.game.findUnique({
      where: { rawgId: data.rawgId },
    });

    if (!game) {
      throw new AppError(
        "GAME_NOT_FOUND",
        `Game with RAWG ID ${data.rawgId} not found`,
        404
      );
    }

    // 2. Validate platform exists → RN-05
    const platform = await this.prisma.platform.findUnique({
      where: { id: data.platformId },
    });

    if (!platform) {
      throw new AppError(
        "PLATFORM_NOT_FOUND",
        `Platform "${data.platformId}" not found`,
        404
      );
    }

    // 3. Validate platform is active → RN-05
    if (!platform.isActive) {
      throw new AppError(
        "PLATFORM_NOT_ACTIVE",
        `Platform "${platform.name}" is inactive`,
        409
      );
    }

    // 4. Check for duplicate → RN-04
    const existing = await this.prisma.userGame.findUnique({
      where: {
        userId_gameId: {
          userId,
          gameId: game.id,
        },
      },
    });

    if (existing) {
      throw new AppError(
        "GAME_ALREADY_IN_LIBRARY",
        `Game "${game.title}" is already in your library`,
        409
      );
    }

    // 5. Create UserGame entry
    const userGame = await this.prisma.userGame.create({
      data: {
        userId,
        gameId: game.id,
        platformId: data.platformId,
        status: data.status as any,
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.playtimeHours !== undefined && { playtimeHours: data.playtimeHours }),
        ...(data.review !== undefined && { review: data.review }),
      },
      include: {
        game: true,
        platform: true,
      },
    });

    return userGame;
  }

  /**
   * List library items for a user with filtering, sorting, search, and pagination.
   * Returns paginated results with game and platform expanded.
   */
  async list(userId: string, options: ListOptions) {
    const { status, platformId, sort, order, page, pageSize, search } = options;

    // Build where clause
    const where: Prisma.UserGameWhereInput = { userId };

    if (status) {
      where.status = status as any;
    }

    if (platformId) {
      where.platformId = platformId;
    }

    if (search) {
      where.game = {
        title: {
          contains: search,
          mode: "insensitive",
        },
      };
    }

    // Build orderBy clause
    let orderBy: Prisma.UserGameOrderByWithRelationInput;

    switch (sort) {
      case "name":
        orderBy = { game: { title: order } };
        break;
      case "rating":
        orderBy = { rating: { sort: order, nulls: "last" } };
        break;
      case "playtime":
        orderBy = { playtimeHours: { sort: order, nulls: "last" } };
        break;
      case "added":
      default:
        orderBy = { addedAt: order };
        break;
    }

    // Count total items
    const totalItems = await this.prisma.userGame.count({ where });

    // Fetch paginated data with includes
    const data = await this.prisma.userGame.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        game: true,
        platform: true,
      },
    });

    return {
      data,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        page,
        pageSize,
      },
    };
  }

  /**
   * Update a library item (UserGame) for a user.
   * Throws LIBRARY_ITEM_NOT_FOUND (404) if item doesn't belong to user.
   */
  async update(userId: string, itemId: string, data: UpdateGameData) {
    // Verify ownership
    const existing = await this.prisma.userGame.findFirst({
      where: { id: itemId, userId },
    });

    if (!existing) {
      throw new AppError(
        "LIBRARY_ITEM_NOT_FOUND",
        "Library item not found or does not belong to this user",
        404
      );
    }

    return this.prisma.userGame.update({
      where: { id: itemId },
      data: {
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.platformId !== undefined && { platformId: data.platformId }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.playtimeHours !== undefined && { playtimeHours: data.playtimeHours }),
        ...(data.review !== undefined && { review: data.review }),
      },
      include: {
        game: true,
        platform: true,
      },
    });
  }

  /**
   * Delete a library item (UserGame) for a user.
   * Throws LIBRARY_ITEM_NOT_FOUND (404) if item doesn't belong to user.
   */
  async delete(userId: string, itemId: string) {
    // Verify ownership
    const existing = await this.prisma.userGame.findFirst({
      where: { id: itemId, userId },
    });

    if (!existing) {
      throw new AppError(
        "LIBRARY_ITEM_NOT_FOUND",
        "Library item not found or does not belong to this user",
        404
      );
    }

    await this.prisma.userGame.delete({
      where: { id: itemId },
    });

    return { deleted: true };
  }
}
