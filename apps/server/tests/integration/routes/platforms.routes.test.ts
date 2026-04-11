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

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = createApp();

async function cleanDatabase() {
  await prisma.session.deleteMany();
  await prisma.recommendationEvent.deleteMany();
  await prisma.userRecommendationFeedback.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

describe("Platforms Routes Integration", () => {
  let authAgent: ReturnType<typeof request.agent>;
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

    authAgent = request.agent(app);
    const registerRes = await authAgent.post("/api/v1/auth/register").send({
      username: "testuser_integration",
      email: "testuser_integration@example.com",
      password: "TestPassword123",
    });

    defaultUser = { id: registerRes.body.data.user.id };
  });

  describe("GET /api/v1/platforms", () => {
    it("should return 200 with an empty list when no platforms exist", async () => {
      const res = await authAgent.get("/api/v1/platforms");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("should return 200 with list of platforms belonging to the user", async () => {
      await prisma.platform.createMany({
        data: [
          { userId: defaultUser.id, name: "PC", manufacturer: "Various" },
          { userId: defaultUser.id, name: "PS5", manufacturer: "Sony" },
        ],
      });

      const res = await authAgent.get("/api/v1/platforms");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty("id");
      expect(res.body.data[0]).toHaveProperty("name");
      expect(res.body.data[0]).toHaveProperty("manufacturer");
      expect(res.body.data[0]).toHaveProperty("isActive");
    });
  });

  describe("POST /api/v1/platforms", () => {
    it("should return 201 when creating a platform with valid body", async () => {
      const res = await authAgent.post("/api/v1/platforms").send({
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

    it("should return 409 when creating platform with duplicate name", async () => {
      await authAgent.post("/api/v1/platforms").send({ name: "PC", manufacturer: "Various" });
      const res = await authAgent.post("/api/v1/platforms").send({ name: "PC", manufacturer: "Various" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("PLATFORM_ALREADY_EXISTS");
    });
  });

  describe("PUT /api/v1/platforms/:id", () => {
    it("should return 200 with updated data", async () => {
      const platform = await prisma.platform.create({
        data: {
          userId: defaultUser.id,
          name: "PC",
          manufacturer: "Various",
        },
      });

      const res = await authAgent.put(`/api/v1/platforms/${platform.id}`).send({ name: "Gaming PC", isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Gaming PC");
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe("DELETE /api/v1/platforms/:id", () => {
    it("should return 200 when deleting a platform with no games", async () => {
      const platform = await prisma.platform.create({
        data: {
          userId: defaultUser.id,
          name: "Xbox",
          manufacturer: "Microsoft",
        },
      });

      const res = await authAgent.delete(`/api/v1/platforms/${platform.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
    });
  });
});
