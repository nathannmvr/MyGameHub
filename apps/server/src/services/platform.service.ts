// src/services/platform.service.ts
// Platform CRUD service with business rule enforcement
// RN-02: Unique platform name per user
// RN-03: Cannot delete platform with associated library items

import { PrismaClient, Prisma } from "@prisma/client";
import { AppError } from "../middleware/error-handler.js";

export interface CreatePlatformData {
  name: string;
  manufacturer: string;
  icon?: string;
}

export interface UpdatePlatformData {
  name?: string;
  manufacturer?: string;
  icon?: string;
  isActive?: boolean;
}

export class PlatformService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * List all platforms belonging to a user.
   */
  async listByUser(userId: string) {
    return this.prisma.platform.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Create a new platform for a user.
   * Throws PLATFORM_ALREADY_EXISTS (409) if name is duplicate for user → RN-02
   */
  async create(userId: string, data: CreatePlatformData) {
    try {
      return await this.prisma.platform.create({
        data: {
          userId,
          name: data.name,
          manufacturer: data.manufacturer,
          icon: data.icon ?? "gamepad",
        },
      });
    } catch (error) {
      // Prisma unique constraint violation
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "PLATFORM_ALREADY_EXISTS",
          `Platform "${data.name}" already exists for this user`,
          409
        );
      }
      throw error;
    }
  }

  /**
   * Update an existing platform.
   * Verifies ownership before updating.
   * Throws PLATFORM_NOT_FOUND (404) if platform doesn't belong to user.
   * Throws PLATFORM_ALREADY_EXISTS (409) if renaming to an existing name → RN-02
   */
  async update(userId: string, platformId: string, data: UpdatePlatformData) {
    // Verify ownership
    const existing = await this.prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!existing) {
      throw new AppError(
        "PLATFORM_NOT_FOUND",
        "Platform not found or does not belong to this user",
        404
      );
    }

    // If renaming, check for duplicate RN-02
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.platform.findFirst({
        where: {
          userId,
          name: data.name,
          id: { not: platformId },
        },
      });

      if (duplicate) {
        throw new AppError(
          "PLATFORM_ALREADY_EXISTS",
          `Platform "${data.name}" already exists for this user`,
          409
        );
      }
    }

    return this.prisma.platform.update({
      where: { id: platformId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.manufacturer !== undefined && { manufacturer: data.manufacturer }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Delete a platform.
   * Verifies ownership and checks for associated library items → RN-03
   * Throws PLATFORM_HAS_GAMES (409) if platform has games.
   * Throws PLATFORM_NOT_FOUND (404) if platform doesn't belong to user.
   */
  async delete(userId: string, platformId: string) {
    // Verify ownership
    const existing = await this.prisma.platform.findFirst({
      where: { id: platformId, userId },
    });

    if (!existing) {
      throw new AppError(
        "PLATFORM_NOT_FOUND",
        "Platform not found or does not belong to this user",
        404
      );
    }

    // Check for associated library items → RN-03
    const associatedGames = await this.prisma.userGame.count({
      where: { platformId },
    });

    if (associatedGames > 0) {
      throw new AppError(
        "PLATFORM_HAS_GAMES",
        `Platform has ${associatedGames} associated game(s). Remove them first.`,
        409
      );
    }

    await this.prisma.platform.delete({
      where: { id: platformId },
    });

    return { deleted: true };
  }
}
