// tests/integration/routes/steam.routes.test.ts
// TDD RED -> GREEN: Steam sync endpoints.

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

// Load .env from apps/server
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = createApp();

async function cleanDatabase() {
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

async function getDefaultUser() {
  const existing = await prisma.user.findFirst();
  if (existing) return existing;
  return prisma.user.create({ data: { username: "steam_integration_user" } });
}

describe("Steam Routes Integration", () => {
  let user: { id: string };
  let platform: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    enqueueSteamSyncJobMock.mockReset();
    enqueueSteamSyncJobMock.mockResolvedValue("queue-job-1");

    user = await getDefaultUser();
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
    const res = await request(app)
      .post("/api/v1/steam/sync")
      .send({
        steamId: "76561198000000000",
        platformId: platform.id,
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBeDefined();
    expect(res.body.data.status).toBe("PENDING");
    expect(enqueueSteamSyncJobMock).toHaveBeenCalledTimes(1);
  });

  it("POST /api/v1/steam/sync should return 409 if there is already a RUNNING job (RN-07)", async () => {
    await prisma.syncJob.create({
      data: {
        userId: user.id,
        type: "STEAM",
        status: "RUNNING",
      },
    });

    const res = await request(app)
      .post("/api/v1/steam/sync")
      .send({
        steamId: "76561198000000000",
        platformId: platform.id,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("STEAM_SYNC_ALREADY_RUNNING");
  });

  it("GET /api/v1/steam/sync/:jobId should return status and progress", async () => {
    const syncJob = await prisma.syncJob.create({
      data: {
        userId: user.id,
        type: "STEAM",
        status: "RUNNING",
        totalItems: 100,
        processedItems: 35,
      },
    });

    const res = await request(app).get(`/api/v1/steam/sync/${syncJob.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(syncJob.id);
    expect(res.body.data.status).toBe("RUNNING");
    expect(res.body.data.totalItems).toBe(100);
    expect(res.body.data.processedItems).toBe(35);
  });

  it("GET /api/v1/steam/sync/:jobId should return 404 for invalid id", async () => {
    const res = await request(app).get("/api/v1/steam/sync/non-existent-id");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("SYNC_JOB_NOT_FOUND");
  });
});
