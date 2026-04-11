// src/services/dashboard.service.ts
// Dashboard statistics service
// Aggregates library data into key metrics for the user's dashboard

import { PrismaClient } from "@prisma/client";

export class DashboardService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get aggregated dashboard statistics for a user.
   * Returns: totalGames, byStatus counts, totalPlaytimeHours, averageRating,
   * continuePlaying (PLAYING items), gamesCompletedThisYear, platformDistribution.
   */
  async getStats(userId: string) {
    // 1. Count by status using groupBy
    const statusCounts = await this.prisma.userGame.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    });

    const byStatus: Record<string, number> = {
      WISHLIST: 0,
      BACKLOG: 0,
      PLAYING: 0,
      PLAYED: 0,
      DROPPED: 0,
    };

    let totalGames = 0;
    for (const group of statusCounts) {
      byStatus[group.status] = group._count.id;
      totalGames += group._count.id;
    }

    // 2. Total playtime
    const playtimeAgg = await this.prisma.userGame.aggregate({
      where: { userId },
      _sum: { playtimeHours: true },
    });
    const totalPlaytimeHours = playtimeAgg._sum.playtimeHours ?? 0;

    // 3. Average rating (only rated games)
    const ratingAgg = await this.prisma.userGame.aggregate({
      where: {
        userId,
        rating: { not: null },
      },
      _avg: { rating: true },
    });
    const averageRating = ratingAgg._avg.rating ?? null;

    // 4. Continue playing (items with status PLAYING, include game + platform)
    const continuePlaying = await this.prisma.userGame.findMany({
      where: {
        userId,
        status: "PLAYING",
      },
      include: {
        game: true,
        platform: true,
      },
      orderBy: [
        { updatedAt: "desc" },
        { playtimeHours: { sort: "desc", nulls: "last" } },
      ],
    });

    // 5. Games completed this year (status = PLAYED, addedAt in current year)
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1); // Jan 1st
    const yearEnd = new Date(currentYear + 1, 0, 1); // Jan 1st next year

    const gamesCompletedThisYear = await this.prisma.userGame.count({
      where: {
        userId,
        status: "PLAYED",
        addedAt: {
          gte: yearStart,
          lt: yearEnd,
        },
      },
    });

    // 6. Platform distribution
    const platformGroups = await this.prisma.userGame.groupBy({
      by: ["platformId"],
      where: { userId },
      _count: { id: true },
    });

    // Fetch platform names for the distribution
    const platformIds = platformGroups.map((g) => g.platformId);
    const platforms = await this.prisma.platform.findMany({
      where: { id: { in: platformIds } },
      select: { id: true, name: true },
    });

    const platformMap = new Map(platforms.map((p) => [p.id, p.name]));
    const platformDistribution = platformGroups.map((g) => ({
      platformId: g.platformId,
      platformName: platformMap.get(g.platformId) ?? "Unknown",
      count: g._count.id,
    }));

    return {
      totalGames,
      byStatus,
      totalPlaytimeHours,
      averageRating,
      continuePlaying,
      gamesCompletedThisYear,
      platformDistribution,
    };
  }
}
