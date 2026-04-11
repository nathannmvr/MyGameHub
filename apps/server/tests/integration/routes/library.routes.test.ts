// tests/integration/routes/library.routes.test.ts
// TDD: Integration tests for Library CRUD endpoints
// Business rules: RN-04 (one game per user), RN-05 (valid platformId)

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { createApp } from "../../../src/app.js";

// Load .env from apps/server
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = createApp();

// Helper: clean all tables
async function cleanDatabase() {
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

// Helper: get or create default user for testing
async function getDefaultUser() {
  const existing = await prisma.user.findFirst();
  if (existing) return existing;
  return prisma.user.create({
    data: { username: "testuser_integration" },
  });
}

describe("Library Routes Integration", () => {
  let defaultUser: { id: string };
  let defaultPlatform: { id: string };
  let defaultGame: { id: string; rawgId: number | null };

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    defaultUser = await getDefaultUser();

    // Create a default platform for the user
    defaultPlatform = await prisma.platform.create({
      data: {
        userId: defaultUser.id,
        name: "PC",
        manufacturer: "Various",
      },
    });

    // Create a default game for tests
    defaultGame = await prisma.game.create({
      data: {
        title: "Elden Ring",
        rawgId: 326243,
      },
    });
  });

  // ─── GET /api/v1/library ───
  describe("GET /api/v1/library", () => {
    it("should return 200 with empty paginated list when no library items", async () => {
      const res = await request(app).get("/api/v1/library");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toEqual([]);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.totalItems).toBe(0);
    });

    it("should return 200 with paginated library items including game and platform", async () => {
      // Seed a library entry
      await prisma.userGame.create({
        data: {
          userId: defaultUser.id,
          gameId: defaultGame.id,
          platformId: defaultPlatform.id,
          status: "PLAYING",
          rating: 10,
        },
      });

      const res = await request(app).get("/api/v1/library");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].game).toBeDefined();
      expect(res.body.data.data[0].game.title).toBe("Elden Ring");
      expect(res.body.data.data[0].platform).toBeDefined();
      expect(res.body.data.data[0].platform.name).toBe("PC");
      expect(res.body.data.pagination.totalItems).toBe(1);
    });

    it("should filter by status", async () => {
      const game2 = await prisma.game.create({
        data: { title: "Hades", rawgId: 2222 },
      });

      await prisma.userGame.createMany({
        data: [
          { userId: defaultUser.id, gameId: defaultGame.id, platformId: defaultPlatform.id, status: "PLAYING" },
          { userId: defaultUser.id, gameId: game2.id, platformId: defaultPlatform.id, status: "BACKLOG" },
        ],
      });

      const res = await request(app).get("/api/v1/library?status=PLAYING");

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].status).toBe("PLAYING");
    });

    it("should search by game title", async () => {
      const game2 = await prisma.game.create({
        data: { title: "Zelda TOTK", rawgId: 3333 },
      });

      await prisma.userGame.createMany({
        data: [
          { userId: defaultUser.id, gameId: defaultGame.id, platformId: defaultPlatform.id, status: "PLAYING" },
          { userId: defaultUser.id, gameId: game2.id, platformId: defaultPlatform.id, status: "BACKLOG" },
        ],
      });

      const res = await request(app).get("/api/v1/library?search=Elden");

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].game.title).toBe("Elden Ring");
    });
  });

  // ─── POST /api/v1/library ───
  describe("POST /api/v1/library", () => {
    it("should return 201 when adding a game to library", async () => {
      const res = await request(app)
        .post("/api/v1/library")
        .send({
          rawgId: 326243,
          platformId: defaultPlatform.id,
          status: "BACKLOG",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gameId).toBe(defaultGame.id);
      expect(res.body.data.platformId).toBe(defaultPlatform.id);
      expect(res.body.data.status).toBe("BACKLOG");
      expect(res.body.data.game).toBeDefined();
      expect(res.body.data.platform).toBeDefined();
    });

    it("should return 201 with optional fields", async () => {
      const res = await request(app)
        .post("/api/v1/library")
        .send({
          rawgId: 326243,
          platformId: defaultPlatform.id,
          status: "PLAYED",
          rating: 9,
          playtimeHours: 120.5,
          review: "Masterpiece!",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(9);
      expect(res.body.data.playtimeHours).toBe(120.5);
      expect(res.body.data.review).toBe("Masterpiece!");
    });

    it("should return 409 when adding duplicate game → RN-04", async () => {
      // First add succeeds
      await request(app)
        .post("/api/v1/library")
        .send({
          rawgId: 326243,
          platformId: defaultPlatform.id,
          status: "PLAYING",
        });

      // Second add should fail
      const res = await request(app)
        .post("/api/v1/library")
        .send({
          rawgId: 326243,
          platformId: defaultPlatform.id,
          status: "BACKLOG",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("GAME_ALREADY_IN_LIBRARY");
    });

    it("should return 404 when platformId doesn't exist → RN-05", async () => {
      const res = await request(app)
        .post("/api/v1/library")
        .send({
          rawgId: 326243,
          platformId: "non-existent-platform",
          status: "BACKLOG",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("PLATFORM_NOT_FOUND");
    });

    it("should return 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/v1/library")
        .send({ rawgId: 123 }); // missing platformId and status

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ─── PUT /api/v1/library/:id ───
  describe("PUT /api/v1/library/:id", () => {
    it("should return 200 with updated library item", async () => {
      const entry = await prisma.userGame.create({
        data: {
          userId: defaultUser.id,
          gameId: defaultGame.id,
          platformId: defaultPlatform.id,
          status: "BACKLOG",
        },
      });

      const res = await request(app)
        .put(`/api/v1/library/${entry.id}`)
        .send({
          status: "PLAYING",
          rating: 8,
          review: "Great game!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("PLAYING");
      expect(res.body.data.rating).toBe(8);
      expect(res.body.data.review).toBe("Great game!");
    });

    it("should return 404 when updating non-existent library item", async () => {
      const res = await request(app)
        .put("/api/v1/library/non-existent-id")
        .send({ status: "PLAYING" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("LIBRARY_ITEM_NOT_FOUND");
    });
  });

  // ─── DELETE /api/v1/library/:id ───
  describe("DELETE /api/v1/library/:id", () => {
    it("should return 200 when deleting a library item", async () => {
      const entry = await prisma.userGame.create({
        data: {
          userId: defaultUser.id,
          gameId: defaultGame.id,
          platformId: defaultPlatform.id,
          status: "DROPPED",
        },
      });

      const res = await request(app).delete(`/api/v1/library/${entry.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);

      // Verify it's gone
      const found = await prisma.userGame.findUnique({ where: { id: entry.id } });
      expect(found).toBeNull();
    });

    it("should return 404 when deleting non-existent library item", async () => {
      const res = await request(app).delete("/api/v1/library/non-existent-id");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("LIBRARY_ITEM_NOT_FOUND");
    });
  });
});
