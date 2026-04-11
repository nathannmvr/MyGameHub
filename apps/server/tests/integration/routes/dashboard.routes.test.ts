// tests/integration/routes/dashboard.routes.test.ts
// TDD: Integration tests for Dashboard stats endpoint

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

describe("Dashboard Routes Integration", () => {
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
      username: "dashboard_user",
      email: "dashboard_user@example.com",
      password: "TestPassword123",
    });
    defaultUser = { id: registerRes.body.data.user.id };
  });

  describe("GET /api/v1/dashboard/stats", () => {
    it("should return 200 with empty stats when no library items", async () => {
      const res = await authAgent.get("/api/v1/dashboard/stats");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalGames).toBe(0);
    });
  });
});
