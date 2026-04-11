// tests/integration/routes/library.routes.test.ts
// TDD: Integration tests for Library CRUD endpoints

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

describe("Library Routes Integration", () => {
  let authAgent: ReturnType<typeof request.agent>;
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

    authAgent = request.agent(app);
    const registerRes = await authAgent.post("/api/v1/auth/register").send({
      username: "testuser_library",
      email: "testuser_library@example.com",
      password: "TestPassword123",
    });
    defaultUser = { id: registerRes.body.data.user.id };

    defaultPlatform = await prisma.platform.create({
      data: {
        userId: defaultUser.id,
        name: "PC",
        manufacturer: "Various",
      },
    });

    defaultGame = await prisma.game.create({
      data: {
        title: "Elden Ring",
        rawgId: 326243,
      },
    });
  });

  it("GET /api/v1/library should return 200", async () => {
    const res = await authAgent.get("/api/v1/library");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/v1/library should add game", async () => {
    const res = await authAgent.post("/api/v1/library").send({
      rawgId: 326243,
      platformId: defaultPlatform.id,
      status: "BACKLOG",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.gameId).toBe(defaultGame.id);
  });
});
