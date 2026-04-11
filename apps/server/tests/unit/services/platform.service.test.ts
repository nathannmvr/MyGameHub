// tests/unit/services/platform.service.test.ts
// TDD: Platform Service unit tests
// Business rules: RN-02 (unique name per user), RN-03 (no delete with games)

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

import { PlatformService } from "../../../src/services/platform.service.js";

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

// Helper: create a test user
async function createTestUser(username?: string) {
  return prisma.user.create({
    data: {
      username: username || `testuser_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
  });
}

describe("PlatformService", () => {
  let service: PlatformService;

  beforeAll(async () => {
    await prisma.$connect();
    service = new PlatformService(prisma);
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  // ─── listByUser ───
  describe("listByUser", () => {
    it("should return only platforms belonging to the given userId", async () => {
      const user1 = await createTestUser("user_alpha");
      const user2 = await createTestUser("user_beta");

      await prisma.platform.createMany({
        data: [
          { userId: user1.id, name: "PC", manufacturer: "Various" },
          { userId: user1.id, name: "PS5", manufacturer: "Sony" },
          { userId: user2.id, name: "Xbox", manufacturer: "Microsoft" },
        ],
      });

      const result = await service.listByUser(user1.id);

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.userId === user1.id)).toBe(true);
      expect(result.map((p) => p.name)).toContain("PC");
      expect(result.map((p) => p.name)).toContain("PS5");
    });

    it("should return empty array if user has no platforms", async () => {
      const user = await createTestUser();
      const result = await service.listByUser(user.id);
      expect(result).toHaveLength(0);
    });
  });

  // ─── create ───
  describe("create", () => {
    it("should create a platform with valid data", async () => {
      const user = await createTestUser();

      const platform = await service.create(user.id, {
        name: "Nintendo Switch",
        manufacturer: "Nintendo",
        icon: "nintendo-switch",
      });

      expect(platform.id).toBeDefined();
      expect(platform.name).toBe("Nintendo Switch");
      expect(platform.manufacturer).toBe("Nintendo");
      expect(platform.icon).toBe("nintendo-switch");
      expect(platform.isActive).toBe(true);
      expect(platform.userId).toBe(user.id);
    });

    it("should use default icon 'gamepad' when icon is not provided", async () => {
      const user = await createTestUser();

      const platform = await service.create(user.id, {
        name: "PC",
        manufacturer: "Various",
      });

      expect(platform.icon).toBe("gamepad");
    });

    it("should throw RN-02 error when creating platform with duplicate name for same user", async () => {
      const user = await createTestUser();

      await service.create(user.id, {
        name: "PlayStation 5",
        manufacturer: "Sony",
      });

      await expectAppError(
        service.create(user.id, {
          name: "PlayStation 5",
          manufacturer: "Sony",
        }),
        "PLATFORM_ALREADY_EXISTS"
      );
    });

    it("should allow same platform name for different users", async () => {
      const user1 = await createTestUser("user_one");
      const user2 = await createTestUser("user_two");

      const p1 = await service.create(user1.id, {
        name: "PC",
        manufacturer: "Various",
      });

      const p2 = await service.create(user2.id, {
        name: "PC",
        manufacturer: "Various",
      });

      expect(p1.id).toBeDefined();
      expect(p2.id).toBeDefined();
      expect(p1.id).not.toBe(p2.id);
    });
  });

  // ─── update ───
  describe("update", () => {
    it("should update platform fields", async () => {
      const user = await createTestUser();
      const platform = await service.create(user.id, {
        name: "PC",
        manufacturer: "Various",
      });

      const updated = await service.update(user.id, platform.id, {
        name: "Gaming PC",
        isActive: false,
      });

      expect(updated.name).toBe("Gaming PC");
      expect(updated.isActive).toBe(false);
      expect(updated.manufacturer).toBe("Various"); // unchanged
    });

    it("should throw error when updating a platform that doesn't belong to the user", async () => {
      const user1 = await createTestUser("owner");
      const user2 = await createTestUser("intruder");

      const platform = await service.create(user1.id, {
        name: "PS5",
        manufacturer: "Sony",
      });

      await expectAppError(
        service.update(user2.id, platform.id, { name: "Hacked" }),
        "PLATFORM_NOT_FOUND"
      );
    });

    it("should throw error when updating non-existent platform", async () => {
      const user = await createTestUser();

      await expectAppError(
        service.update(user.id, "non-existent-id", { name: "Ghost" }),
        "PLATFORM_NOT_FOUND"
      );
    });

    it("should throw RN-02 error when updating name to an existing name for the same user", async () => {
      const user = await createTestUser();

      await service.create(user.id, {
        name: "PC",
        manufacturer: "Various",
      });

      const platform2 = await service.create(user.id, {
        name: "PS5",
        manufacturer: "Sony",
      });

      await expectAppError(
        service.update(user.id, platform2.id, { name: "PC" }),
        "PLATFORM_ALREADY_EXISTS"
      );
    });
  });

  // ─── delete ───
  describe("delete", () => {
    it("should delete a platform with no associated library items", async () => {
      const user = await createTestUser();
      const platform = await service.create(user.id, {
        name: "Xbox",
        manufacturer: "Microsoft",
      });

      const result = await service.delete(user.id, platform.id);

      expect(result.deleted).toBe(true);

      // Verify it's actually gone
      const found = await prisma.platform.findUnique({
        where: { id: platform.id },
      });
      expect(found).toBeNull();
    });

    it("should throw RN-03 error when deleting platform with associated library items", async () => {
      const user = await createTestUser();
      const platform = await service.create(user.id, {
        name: "PS5",
        manufacturer: "Sony",
      });

      // Create a game and associate it with this platform
      const game = await prisma.game.create({
        data: { title: "God of War", rawgId: 99999 },
      });

      await prisma.userGame.create({
        data: {
          userId: user.id,
          gameId: game.id,
          platformId: platform.id,
          status: "PLAYING",
        },
      });

      await expectAppError(
        service.delete(user.id, platform.id),
        "PLATFORM_HAS_GAMES"
      );
    });

    it("should throw error when deleting a platform from another user", async () => {
      const user1 = await createTestUser("owner2");
      const user2 = await createTestUser("intruder2");

      const platform = await service.create(user1.id, {
        name: "Switch",
        manufacturer: "Nintendo",
      });

      await expectAppError(
        service.delete(user2.id, platform.id),
        "PLATFORM_NOT_FOUND"
      );
    });
  });
});
