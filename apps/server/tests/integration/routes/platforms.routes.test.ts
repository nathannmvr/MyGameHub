// tests/integration/routes/platforms.routes.test.ts
// TDD: Integration tests for Platform CRUD endpoints
// Business rules: RN-02 (unique name), RN-03 (no delete with games)

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
// Since there's no auth yet, the backend uses a default user
async function getDefaultUser() {
  const existing = await prisma.user.findFirst();
  if (existing) return existing;
  return prisma.user.create({
    data: { username: "testuser_integration" },
  });
}

describe("Platforms Routes Integration", () => {
  let defaultUser: { id: string };

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
  });

  // ─── GET /api/v1/platforms ───
  describe("GET /api/v1/platforms", () => {
    it("should return 200 with an empty list when no platforms exist", async () => {
      const res = await request(app).get("/api/v1/platforms");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("should return 200 with list of platforms belonging to the user", async () => {
      // Seed platforms directly
      await prisma.platform.createMany({
        data: [
          { userId: defaultUser.id, name: "PC", manufacturer: "Various" },
          { userId: defaultUser.id, name: "PS5", manufacturer: "Sony" },
        ],
      });

      const res = await request(app).get("/api/v1/platforms");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty("id");
      expect(res.body.data[0]).toHaveProperty("name");
      expect(res.body.data[0]).toHaveProperty("manufacturer");
      expect(res.body.data[0]).toHaveProperty("isActive");
    });
  });

  // ─── POST /api/v1/platforms ───
  describe("POST /api/v1/platforms", () => {
    it("should return 201 when creating a platform with valid body", async () => {
      const res = await request(app)
        .post("/api/v1/platforms")
        .send({
          name: "Nintendo Switch",
          manufacturer: "Nintendo",
          icon: "nintendo-switch",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Nintendo Switch");
      expect(res.body.data.manufacturer).toBe("Nintendo");
      expect(res.body.data.icon).toBe("nintendo-switch");
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    it("should return 201 with default icon when icon not provided", async () => {
      const res = await request(app)
        .post("/api/v1/platforms")
        .send({
          name: "Xbox Series X",
          manufacturer: "Microsoft",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.icon).toBe("gamepad");
    });

    it("should return 400 when name is missing", async () => {
      const res = await request(app)
        .post("/api/v1/platforms")
        .send({ manufacturer: "Sony" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 409 when creating platform with duplicate name → RN-02", async () => {
      // First creation succeeds
      await request(app)
        .post("/api/v1/platforms")
        .send({ name: "PC", manufacturer: "Various" });

      // Second creation with same name should fail
      const res = await request(app)
        .post("/api/v1/platforms")
        .send({ name: "PC", manufacturer: "Various" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("PLATFORM_ALREADY_EXISTS");
    });
  });

  // ─── PUT /api/v1/platforms/:id ───
  describe("PUT /api/v1/platforms/:id", () => {
    it("should return 200 with updated data", async () => {
      const platform = await prisma.platform.create({
        data: {
          userId: defaultUser.id,
          name: "PC",
          manufacturer: "Various",
        },
      });

      const res = await request(app)
        .put(`/api/v1/platforms/${platform.id}`)
        .send({ name: "Gaming PC", isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Gaming PC");
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.data.manufacturer).toBe("Various"); // unchanged
    });

    it("should return 404 when updating non-existent platform", async () => {
      const res = await request(app)
        .put("/api/v1/platforms/non-existent-id")
        .send({ name: "Ghost" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("PLATFORM_NOT_FOUND");
    });
  });

  // ─── DELETE /api/v1/platforms/:id ───
  describe("DELETE /api/v1/platforms/:id", () => {
    it("should return 200 when deleting a platform with no games", async () => {
      const platform = await prisma.platform.create({
        data: {
          userId: defaultUser.id,
          name: "Xbox",
          manufacturer: "Microsoft",
        },
      });

      const res = await request(app).delete(`/api/v1/platforms/${platform.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
    });

    it("should return 409 when deleting a platform with associated games → RN-03", async () => {
      const platform = await prisma.platform.create({
        data: {
          userId: defaultUser.id,
          name: "PS5",
          manufacturer: "Sony",
        },
      });

      const game = await prisma.game.create({
        data: { title: "Test Game" },
      });

      await prisma.userGame.create({
        data: {
          userId: defaultUser.id,
          gameId: game.id,
          platformId: platform.id,
          status: "PLAYING",
        },
      });

      const res = await request(app).delete(`/api/v1/platforms/${platform.id}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("PLATFORM_HAS_GAMES");
    });

    it("should return 404 when deleting non-existent platform", async () => {
      const res = await request(app).delete("/api/v1/platforms/non-existent-id");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("PLATFORM_NOT_FOUND");
    });
  });
});
