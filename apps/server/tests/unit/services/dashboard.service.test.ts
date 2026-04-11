// tests/unit/services/dashboard.service.test.ts
// TDD: Dashboard Service unit tests
// Returns aggregated statistics for the user's library

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

// Load .env from apps/server
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

import { DashboardService } from "../../../src/services/dashboard.service.js";

// Helper: clean all tables
async function cleanDatabase() {
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

describe("DashboardService", () => {
  let service: DashboardService;
  let testUser: { id: string };
  let testPlatform: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
    service = new DashboardService(prisma);
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();

    testUser = await prisma.user.create({
      data: { username: `testuser_${Date.now()}_${Math.random().toString(36).slice(2)}` },
    });

    testPlatform = await prisma.platform.create({
      data: {
        userId: testUser.id,
        name: "PC",
        manufacturer: "Various",
      },
    });
  });

  // Helper: create a game and add to library
  async function addGameToLibrary(overrides: {
    title?: string;
    rawgId?: number;
    status?: string;
    rating?: number | null;
    playtimeHours?: number | null;
    addedAt?: Date;
  } = {}) {
    const game = await prisma.game.create({
      data: {
        title: overrides.title ?? `Game_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        rawgId: overrides.rawgId ?? Math.floor(Math.random() * 999999),
      },
    });

    const userGame = await prisma.userGame.create({
      data: {
        userId: testUser.id,
        gameId: game.id,
        platformId: testPlatform.id,
        status: (overrides.status ?? "BACKLOG") as any,
        rating: overrides.rating ?? null,
        playtimeHours: overrides.playtimeHours ?? null,
        ...(overrides.addedAt && { addedAt: overrides.addedAt }),
      },
    });

    return { game, userGame };
  }

  describe("getStats", () => {
    it("should return correct count by status", async () => {
      await addGameToLibrary({ status: "PLAYING" });
      await addGameToLibrary({ status: "PLAYING" });
      await addGameToLibrary({ status: "PLAYED" });
      await addGameToLibrary({ status: "BACKLOG" });
      await addGameToLibrary({ status: "BACKLOG" });
      await addGameToLibrary({ status: "BACKLOG" });
      await addGameToLibrary({ status: "DROPPED" });
      await addGameToLibrary({ status: "WISHLIST" });

      const stats = await service.getStats(testUser.id);

      expect(stats.totalGames).toBe(8);
      expect(stats.byStatus.PLAYING).toBe(2);
      expect(stats.byStatus.PLAYED).toBe(1);
      expect(stats.byStatus.BACKLOG).toBe(3);
      expect(stats.byStatus.DROPPED).toBe(1);
      expect(stats.byStatus.WISHLIST).toBe(1);
    });

    it("should return total playtime", async () => {
      await addGameToLibrary({ playtimeHours: 50 });
      await addGameToLibrary({ playtimeHours: 120.5 });
      await addGameToLibrary({ playtimeHours: 30 });
      await addGameToLibrary({}); // null playtime

      const stats = await service.getStats(testUser.id);

      expect(stats.totalPlaytimeHours).toBe(200.5);
    });

    it("should return average rating (only rated games)", async () => {
      await addGameToLibrary({ rating: 10 });
      await addGameToLibrary({ rating: 8 });
      await addGameToLibrary({ rating: 6 });
      await addGameToLibrary({}); // null rating (should not affect average)

      const stats = await service.getStats(testUser.id);

      expect(stats.averageRating).toBe(8); // (10+8+6)/3 = 8
    });

    it("should return continuePlaying only with status PLAYING", async () => {
      const { game: playingGame1 } = await addGameToLibrary({ title: "Elden Ring", status: "PLAYING", playtimeHours: 50 });
      const { game: playingGame2 } = await addGameToLibrary({ title: "Zelda TOTK", status: "PLAYING", playtimeHours: 20 });
      await addGameToLibrary({ title: "Hades", status: "PLAYED", playtimeHours: 80 });
      await addGameToLibrary({ title: "Cyberpunk", status: "BACKLOG" });

      const stats = await service.getStats(testUser.id);

      expect(stats.continuePlaying).toHaveLength(2);
      const titles = stats.continuePlaying.map((item: any) => item.game.title);
      expect(titles).toContain("Elden Ring");
      expect(titles).toContain("Zelda TOTK");
    });

    it("should return gamesCompletedThisYear filtering by current year", async () => {
      const thisYear = new Date();
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);

      // Games completed (PLAYED) this year
      await addGameToLibrary({ title: "Recent Game", status: "PLAYED", addedAt: thisYear });

      // Games completed last year (should not count)
      await addGameToLibrary({ title: "Old Game", status: "PLAYED", addedAt: lastYear });

      // Games not completed (should not count)
      await addGameToLibrary({ title: "Still Playing", status: "PLAYING", addedAt: thisYear });

      const stats = await service.getStats(testUser.id);

      expect(stats.gamesCompletedThisYear).toBe(1);
    });

    it("should return empty/zero stats when user has no games", async () => {
      const stats = await service.getStats(testUser.id);

      expect(stats.totalGames).toBe(0);
      expect(stats.totalPlaytimeHours).toBe(0);
      expect(stats.averageRating).toBeNull();
      expect(stats.continuePlaying).toEqual([]);
      expect(stats.gamesCompletedThisYear).toBe(0);
      expect(stats.byStatus.PLAYING).toBe(0);
      expect(stats.byStatus.PLAYED).toBe(0);
      expect(stats.byStatus.BACKLOG).toBe(0);
      expect(stats.byStatus.DROPPED).toBe(0);
      expect(stats.byStatus.WISHLIST).toBe(0);
    });

    it("should return platform distribution", async () => {
      const ps5 = await prisma.platform.create({
        data: { userId: testUser.id, name: "PS5", manufacturer: "Sony" },
      });

      await addGameToLibrary({ status: "PLAYING" }); // PC (default)
      await addGameToLibrary({ status: "PLAYED" });   // PC (default)

      // Add game on PS5
      const game3 = await prisma.game.create({
        data: { title: "God of War", rawgId: 58175 },
      });
      await prisma.userGame.create({
        data: {
          userId: testUser.id,
          gameId: game3.id,
          platformId: ps5.id,
          status: "PLAYED",
        },
      });

      const stats = await service.getStats(testUser.id);

      expect(stats.platformDistribution).toBeDefined();
      expect(stats.platformDistribution).toHaveLength(2);

      const pcDist = stats.platformDistribution.find((p: any) => p.platformName === "PC");
      const ps5Dist = stats.platformDistribution.find((p: any) => p.platformName === "PS5");
      expect(pcDist!.count).toBe(2);
      expect(ps5Dist!.count).toBe(1);
    });
  });
});
