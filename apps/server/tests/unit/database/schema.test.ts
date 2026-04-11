// tests/unit/database/schema.test.ts
// TDD: Database integrity constraint tests
// Verifies that business rules RN-02, RN-03, RN-04 are enforced at the database level

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

// Load .env from apps/server
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper: clean all tables in correct order (respecting FK constraints)
async function cleanDatabase() {
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

// Helper: create a test user
async function createTestUser(overrides: Partial<Prisma.UserCreateInput> = {}) {
  return prisma.user.create({
    data: {
      username: `testuser_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      email: null,
      ...overrides,
    },
  });
}

// Helper: create a test platform for a user
async function createTestPlatform(
  userId: string,
  overrides: Partial<Prisma.PlatformUncheckedCreateInput> = {}
) {
  return prisma.platform.create({
    data: {
      userId,
      name: `Platform_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      manufacturer: "TestManufacturer",
      ...overrides,
    },
  });
}

// Helper: create a test game
async function createTestGame(overrides: Partial<Prisma.GameCreateInput> = {}) {
  return prisma.game.create({
    data: {
      title: `Game_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ...overrides,
    },
  });
}

describe("Database Schema Integrity Tests", () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  // ─────────────────────────────────────────────
  // USER CONSTRAINTS
  // ─────────────────────────────────────────────
  describe("User constraints", () => {
    it("should NOT allow duplicate usernames", async () => {
      await createTestUser({ username: "duplicate_user" });

      await expect(
        createTestUser({ username: "duplicate_user" })
      ).rejects.toThrow();
    });

    it("should allow creating users with unique usernames", async () => {
      const user1 = await createTestUser({ username: "user_alpha" });
      const user2 = await createTestUser({ username: "user_beta" });

      expect(user1.id).toBeDefined();
      expect(user2.id).toBeDefined();
      expect(user1.id).not.toBe(user2.id);
    });
  });

  // ─────────────────────────────────────────────
  // PLATFORM CONSTRAINTS — RN-02
  // ─────────────────────────────────────────────
  describe("Platform constraints (RN-02)", () => {
    it("should NOT allow duplicate platform names for the same user", async () => {
      const user = await createTestUser();

      await createTestPlatform(user.id, {
        name: "PlayStation 5",
        manufacturer: "Sony",
      });

      // Attempting to create another platform with the same name for the same user
      await expect(
        createTestPlatform(user.id, {
          name: "PlayStation 5",
          manufacturer: "Sony",
        })
      ).rejects.toThrow();
    });

    it("should ALLOW the same platform name for different users", async () => {
      const user1 = await createTestUser({ username: "user_one" });
      const user2 = await createTestUser({ username: "user_two" });

      const platform1 = await createTestPlatform(user1.id, {
        name: "Nintendo Switch",
        manufacturer: "Nintendo",
      });

      const platform2 = await createTestPlatform(user2.id, {
        name: "Nintendo Switch",
        manufacturer: "Nintendo",
      });

      expect(platform1.id).toBeDefined();
      expect(platform2.id).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────
  // USERGAME CONSTRAINTS — RN-04
  // ─────────────────────────────────────────────
  describe("UserGame constraints (RN-04)", () => {
    it("should NOT allow the same game twice in a user's library", async () => {
      const user = await createTestUser();
      const platform = await createTestPlatform(user.id, {
        name: "PC",
        manufacturer: "Various",
      });
      const game = await createTestGame({ title: "The Witcher 3" });

      // First entry — should succeed
      await prisma.userGame.create({
        data: {
          userId: user.id,
          gameId: game.id,
          platformId: platform.id,
          status: "PLAYING",
        },
      });

      // Second entry with the same user + game — should fail
      await expect(
        prisma.userGame.create({
          data: {
            userId: user.id,
            gameId: game.id,
            platformId: platform.id,
            status: "BACKLOG",
          },
        })
      ).rejects.toThrow();
    });

    it("should ALLOW the same game for different users", async () => {
      const user1 = await createTestUser({ username: "gamer_a" });
      const user2 = await createTestUser({ username: "gamer_b" });
      const platform1 = await createTestPlatform(user1.id, {
        name: "PC",
        manufacturer: "Various",
      });
      const platform2 = await createTestPlatform(user2.id, {
        name: "PC",
        manufacturer: "Various",
      });
      const game = await createTestGame({ title: "Elden Ring" });

      const entry1 = await prisma.userGame.create({
        data: {
          userId: user1.id,
          gameId: game.id,
          platformId: platform1.id,
          status: "PLAYED",
        },
      });

      const entry2 = await prisma.userGame.create({
        data: {
          userId: user2.id,
          gameId: game.id,
          platformId: platform2.id,
          status: "BACKLOG",
        },
      });

      expect(entry1.id).toBeDefined();
      expect(entry2.id).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────
  // PLATFORM DELETION — RN-03
  // ─────────────────────────────────────────────
  describe("Platform deletion with associated games (RN-03)", () => {
    it("should NOT allow deleting a platform that has associated library items", async () => {
      const user = await createTestUser();
      const platform = await createTestPlatform(user.id, {
        name: "PS5",
        manufacturer: "Sony",
      });
      const game = await createTestGame({ title: "God of War Ragnarok" });

      // Associate game with platform
      await prisma.userGame.create({
        data: {
          userId: user.id,
          gameId: game.id,
          platformId: platform.id,
          status: "PLAYING",
        },
      });

      // Trying to delete the platform should fail (onDelete: Restrict)
      await expect(
        prisma.platform.delete({
          where: { id: platform.id },
        })
      ).rejects.toThrow();
    });

    it("should ALLOW deleting a platform with no associated library items", async () => {
      const user = await createTestUser();
      const platform = await createTestPlatform(user.id, {
        name: "Xbox Series X",
        manufacturer: "Microsoft",
      });

      // No games associated — delete should succeed
      const deleted = await prisma.platform.delete({
        where: { id: platform.id },
      });

      expect(deleted.id).toBe(platform.id);
    });
  });

  // ─────────────────────────────────────────────
  // GAME CONSTRAINTS
  // ─────────────────────────────────────────────
  describe("Game constraints", () => {
    it("should enforce unique rawgId", async () => {
      await createTestGame({ title: "Game A", rawgId: 12345 });

      await expect(
        createTestGame({ title: "Game B", rawgId: 12345 })
      ).rejects.toThrow();
    });

    it("should enforce unique steamAppId", async () => {
      await createTestGame({ title: "Game C", steamAppId: 730 });

      await expect(
        createTestGame({ title: "Game D", steamAppId: 730 })
      ).rejects.toThrow();
    });

    it("should allow null rawgId for multiple games", async () => {
      const game1 = await createTestGame({ title: "Custom Game 1" });
      const game2 = await createTestGame({ title: "Custom Game 2" });

      expect(game1.rawgId).toBeNull();
      expect(game2.rawgId).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // CASCADE DELETION
  // ─────────────────────────────────────────────
  describe("Cascade deletion", () => {
    it("should delete all user data when user is deleted", async () => {
      const user = await createTestUser();
      const platform = await createTestPlatform(user.id, {
        name: "PC",
        manufacturer: "Various",
      });
      const game = await createTestGame({ title: "Cascade Test Game" });

      await prisma.userGame.create({
        data: {
          userId: user.id,
          gameId: game.id,
          platformId: platform.id,
          status: "BACKLOG",
        },
      });

      await prisma.syncJob.create({
        data: {
          userId: user.id,
          type: "STEAM",
          status: "COMPLETED",
        },
      });

      // Delete user — should cascade to platforms, userGames, syncJobs
      await prisma.user.delete({ where: { id: user.id } });

      const platforms = await prisma.platform.findMany({
        where: { userId: user.id },
      });
      const userGames = await prisma.userGame.findMany({
        where: { userId: user.id },
      });
      const syncJobs = await prisma.syncJob.findMany({
        where: { userId: user.id },
      });

      expect(platforms).toHaveLength(0);
      expect(userGames).toHaveLength(0);
      expect(syncJobs).toHaveLength(0);

      // Game should still exist (not owned by user)
      const gameStillExists = await prisma.game.findUnique({
        where: { id: game.id },
      });
      expect(gameStillExists).not.toBeNull();
    });
  });
});
