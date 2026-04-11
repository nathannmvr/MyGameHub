// tests/integration/routes/steam.routes.test.ts

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

const { enqueueSteamSyncJobMock } = vi.hoisted(() => ({
  enqueueSteamSyncJobMock: vi.fn(),
}));

vi.mock("../../../src/jobs/queue.js", () => ({
  enqueueSteamSyncJob: enqueueSteamSyncJobMock,
}));

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

describe("Steam Routes Integration", () => {
  let authAgent: ReturnType<typeof request.agent>;
  let user: { id: string };
  let platform: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    enqueueSteamSyncJobMock.mockReset();
    enqueueSteamSyncJobMock.mockResolvedValue("queue-job-1");

    authAgent = request.agent(app);
    const registerRes = await authAgent.post("/api/v1/auth/register").send({
      username: "steam_integration_user",
      email: "steam_integration_user@example.com",
      password: "TestPassword123",
    });

    user = { id: registerRes.body.data.user.id };
    platform = await prisma.platform.create({
      data: {
        userId: user.id,
        name: "PC",
        manufacturer: "Various",
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("POST /api/v1/steam/sync should return 202 with jobId", async () => {
    const res = await authAgent.post("/api/v1/steam/sync").send({
      steamId: "76561198000000000",
      platformId: platform.id,
    });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
  });
});
