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

describe("Dashboard Routes Integration", () => {
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

  describe("GET /api/v1/dashboard/stats", () => {
    it("should return 200 with empty stats when no library items", async () => {
      const res = await request(app).get("/api/v1/dashboard/stats");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalGames).toBe(0);
      expect(res.body.data.totalPlaytimeHours).toBe(0);
      expect(res.body.data.averageRating).toBeNull();
      expect(res.body.data.continuePlaying).toEqual([]);
      expect(res.body.data.gamesCompletedThisYear).toBe(0);
      expect(res.body.data.byStatus).toBeDefined();
      expect(res.body.data.platformDistribution).toEqual([]);
    });

    it("should return 200 with correct aggregated stats", async () => {
      const platform = await prisma.platform.create({
        data: { userId: defaultUser.id, name: "PC", manufacturer: "Various" },
      });

      const game1 = await prisma.game.create({
        data: { title: "Elden Ring", rawgId: 326243 },
      });
      const game2 = await prisma.game.create({
        data: { title: "Hades", rawgId: 1111 },
      });
      const game3 = await prisma.game.create({
        data: { title: "Zelda TOTK", rawgId: 2222 },
      });

      await prisma.userGame.createMany({
        data: [
          { userId: defaultUser.id, gameId: game1.id, platformId: platform.id, status: "PLAYING", rating: 10, playtimeHours: 200 },
          { userId: defaultUser.id, gameId: game2.id, platformId: platform.id, status: "PLAYED", rating: 9, playtimeHours: 50 },
          { userId: defaultUser.id, gameId: game3.id, platformId: platform.id, status: "BACKLOG" },
        ],
      });

      const res = await request(app).get("/api/v1/dashboard/stats");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalGames).toBe(3);
      expect(res.body.data.byStatus.PLAYING).toBe(1);
      expect(res.body.data.byStatus.PLAYED).toBe(1);
      expect(res.body.data.byStatus.BACKLOG).toBe(1);
      expect(res.body.data.totalPlaytimeHours).toBe(250);
      expect(res.body.data.continuePlaying).toHaveLength(1);
      expect(res.body.data.continuePlaying[0].game.title).toBe("Elden Ring");
      expect(res.body.data.platformDistribution).toHaveLength(1);
    });
  });
});
