// tests/unit/services/library.service.test.ts
// TDD: Library Service unit tests
// Business rules: RN-04 (one game per user), RN-05 (valid platformId)

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { AppError } from "../../../src/middleware/error-handler.js";

// Load .env from apps/server
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

import { LibraryService } from "../../../src/services/library.service.js";

/**
 * Helper: asserts that a promise rejects with an AppError of the given code.
 */
async function expectAppError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    expect.fail(`Expected AppError with code ${code} but promise resolved`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

// Helper: clean all tables
async function cleanDatabase() {
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

describe("LibraryService", () => {
  let service: LibraryService;
  let testUser: { id: string };
  let testPlatform: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
    service = new LibraryService(prisma);
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create default user and platform for each test
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

  // Helper: create a test game
  async function createTestGame(overrides: Partial<Prisma.GameCreateInput> = {}) {
    return prisma.game.create({
      data: {
        title: `Game_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        rawgId: Math.floor(Math.random() * 999999),
        ...overrides,
      },
    });
  }

  // ─── addGame ───
  describe("addGame", () => {
    it("should create a Game locally and UserGame entry", async () => {
      // Pre-create the game in DB (simulating it already exists from RAWG)
      const game = await createTestGame({ title: "Elden Ring", rawgId: 326243 });

      const result = await service.addGame(testUser.id, {
        rawgId: 326243,
        platformId: testPlatform.id,
        status: "BACKLOG",
      });

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testUser.id);
      expect(result.gameId).toBe(game.id);
      expect(result.platformId).toBe(testPlatform.id);
      expect(result.status).toBe("BACKLOG");
      expect(result.game).toBeDefined();
      expect(result.game!.title).toBe("Elden Ring");
      expect(result.platform).toBeDefined();
      expect(result.platform!.name).toBe("PC");
    });

    it("should set optional fields (rating, playtimeHours, review)", async () => {
      await createTestGame({ title: "The Witcher 3", rawgId: 3328 });

      const result = await service.addGame(testUser.id, {
        rawgId: 3328,
        platformId: testPlatform.id,
        status: "PLAYED",
        rating: 9,
        playtimeHours: 120.5,
        review: "Masterpiece!",
      });

      expect(result.rating).toBe(9);
      expect(result.playtimeHours).toBe(120.5);
      expect(result.review).toBe("Masterpiece!");
    });

    it("should throw RN-04 error when adding duplicate game → GAME_ALREADY_IN_LIBRARY", async () => {
      const game = await createTestGame({ rawgId: 3498 });

      await service.addGame(testUser.id, {
        rawgId: 3498,
        platformId: testPlatform.id,
        status: "PLAYING",
      });

      await expectAppError(
        service.addGame(testUser.id, {
          rawgId: 3498,
          platformId: testPlatform.id,
          status: "BACKLOG",
        }),
        "GAME_ALREADY_IN_LIBRARY"
      );
    });

    it("should throw RN-05 error when platformId doesn't exist → PLATFORM_NOT_FOUND", async () => {
      await createTestGame({ rawgId: 5000 });

      await expectAppError(
        service.addGame(testUser.id, {
          rawgId: 5000,
          platformId: "non-existent-platform",
          status: "BACKLOG",
        }),
        "PLATFORM_NOT_FOUND"
      );
    });

    it("should throw RN-05 error when platform is inactive → PLATFORM_NOT_ACTIVE", async () => {
      // Deactivate platform
      await prisma.platform.update({
        where: { id: testPlatform.id },
        data: { isActive: false },
      });

      await createTestGame({ rawgId: 6000 });

      await expectAppError(
        service.addGame(testUser.id, {
          rawgId: 6000,
          platformId: testPlatform.id,
          status: "BACKLOG",
        }),
        "PLATFORM_NOT_ACTIVE"
      );
    });

    it("should throw GAME_NOT_FOUND when rawgId doesn't match any game", async () => {
      await expectAppError(
        service.addGame(testUser.id, {
          rawgId: 999999,
          platformId: testPlatform.id,
          status: "BACKLOG",
        }),
        "GAME_NOT_FOUND"
      );
    });
  });

  // ─── list ───
  describe("list", () => {
    async function seedLibrary() {
      const platform2 = await prisma.platform.create({
        data: { userId: testUser.id, name: "PS5", manufacturer: "Sony" },
      });

      const games = await Promise.all([
        createTestGame({ title: "Elden Ring", rawgId: 1001 }),
        createTestGame({ title: "Zelda TOTK", rawgId: 1002 }),
        createTestGame({ title: "Cyberpunk 2077", rawgId: 1003 }),
        createTestGame({ title: "Hades", rawgId: 1004 }),
      ]);

      await prisma.userGame.createMany({
        data: [
          { userId: testUser.id, gameId: games[0].id, platformId: testPlatform.id, status: "PLAYED", rating: 10, playtimeHours: 200 },
          { userId: testUser.id, gameId: games[1].id, platformId: platform2.id, status: "PLAYING", rating: 9, playtimeHours: 80 },
          { userId: testUser.id, gameId: games[2].id, platformId: testPlatform.id, status: "BACKLOG", rating: null, playtimeHours: null },
          { userId: testUser.id, gameId: games[3].id, platformId: testPlatform.id, status: "PLAYED", rating: 8, playtimeHours: 50 },
        ],
      });

      return { platform2, games };
    }

    it("should return paginated library items with game and platform expanded", async () => {
      await seedLibrary();

      const result = await service.list(testUser.id, {
        page: 1,
        pageSize: 24,
        sort: "added",
        order: "desc",
      });

      expect(result.data).toHaveLength(4);
      expect(result.pagination.totalItems).toBe(4);
      expect(result.pagination.page).toBe(1);
      expect(result.data[0].game).toBeDefined();
      expect(result.data[0].platform).toBeDefined();
    });

    it("should filter by status", async () => {
      await seedLibrary();

      const result = await service.list(testUser.id, {
        status: "PLAYED",
        page: 1,
        pageSize: 24,
        sort: "added",
        order: "desc",
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((item: any) => item.status === "PLAYED")).toBe(true);
    });

    it("should filter by platformId", async () => {
      const { platform2 } = await seedLibrary();

      const result = await service.list(testUser.id, {
        platformId: platform2.id,
        page: 1,
        pageSize: 24,
        sort: "added",
        order: "desc",
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].platformId).toBe(platform2.id);
    });

    it("should sort by rating descending", async () => {
      await seedLibrary();

      const result = await service.list(testUser.id, {
        page: 1,
        pageSize: 24,
        sort: "rating",
        order: "desc",
      });

      // Items with null rating should come after rated items
      const ratings = result.data.map((item: any) => item.rating);
      const nonNullRatings = ratings.filter((r: number | null) => r !== null);
      for (let i = 1; i < nonNullRatings.length; i++) {
        expect(nonNullRatings[i]).toBeLessThanOrEqual(nonNullRatings[i - 1]);
      }
    });

    it("should sort by name ascending", async () => {
      await seedLibrary();

      const result = await service.list(testUser.id, {
        page: 1,
        pageSize: 24,
        sort: "name",
        order: "asc",
      });

      const titles = result.data.map((item: any) => item.game.title);
      const sorted = [...titles].sort((a, b) => a.localeCompare(b));
      expect(titles).toEqual(sorted);
    });

    it("should sort by playtime descending", async () => {
      await seedLibrary();

      const result = await service.list(testUser.id, {
        page: 1,
        pageSize: 24,
        sort: "playtime",
        order: "desc",
      });

      const playtimes = result.data.map((item: any) => item.playtimeHours);
      const nonNullPlaytimes = playtimes.filter((p: number | null) => p !== null);
      for (let i = 1; i < nonNullPlaytimes.length; i++) {
        expect(nonNullPlaytimes[i]).toBeLessThanOrEqual(nonNullPlaytimes[i - 1]);
      }
    });

    it("should paginate correctly", async () => {
      await seedLibrary();

      const page1 = await service.list(testUser.id, {
        page: 1,
        pageSize: 2,
        sort: "added",
        order: "desc",
      });

      expect(page1.data).toHaveLength(2);
      expect(page1.pagination.totalItems).toBe(4);
      expect(page1.pagination.totalPages).toBe(2);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.pageSize).toBe(2);

      const page2 = await service.list(testUser.id, {
        page: 2,
        pageSize: 2,
        sort: "added",
        order: "desc",
      });

      expect(page2.data).toHaveLength(2);
    });

    it("should search by game title", async () => {
      await seedLibrary();

      const result = await service.list(testUser.id, {
        search: "Elden",
        page: 1,
        pageSize: 24,
        sort: "added",
        order: "desc",
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].game.title).toBe("Elden Ring");
    });
  });

  // ─── update ───
  describe("update", () => {
    it("should update individual fields on a library item", async () => {
      const game = await createTestGame({ rawgId: 7777 });
      const entry = await prisma.userGame.create({
        data: {
          userId: testUser.id,
          gameId: game.id,
          platformId: testPlatform.id,
          status: "BACKLOG",
        },
      });

      const updated = await service.update(testUser.id, entry.id, {
        status: "PLAYING",
        rating: 8,
        review: "Great so far!",
      });

      expect(updated.status).toBe("PLAYING");
      expect(updated.rating).toBe(8);
      expect(updated.review).toBe("Great so far!");
    });

    it("should throw LIBRARY_ITEM_NOT_FOUND when item doesn't exist", async () => {
      await expectAppError(
        service.update(testUser.id, "non-existent-id", { status: "PLAYING" }),
        "LIBRARY_ITEM_NOT_FOUND"
      );
    });
  });

  // ─── delete ───
  describe("delete", () => {
    it("should remove a UserGame entry", async () => {
      const game = await createTestGame({ rawgId: 8888 });
      const entry = await prisma.userGame.create({
        data: {
          userId: testUser.id,
          gameId: game.id,
          platformId: testPlatform.id,
          status: "DROPPED",
        },
      });

      const result = await service.delete(testUser.id, entry.id);
      expect(result.deleted).toBe(true);

      // Verify it's gone
      const found = await prisma.userGame.findUnique({ where: { id: entry.id } });
      expect(found).toBeNull();
    });

    it("should throw LIBRARY_ITEM_NOT_FOUND when item doesn't exist", async () => {
      await expectAppError(
        service.delete(testUser.id, "non-existent-id"),
        "LIBRARY_ITEM_NOT_FOUND"
      );
    });
  });
});
