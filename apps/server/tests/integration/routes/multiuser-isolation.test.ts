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

async function createAuthenticatedAgent(prefix: string) {
  const agent = request.agent(app);
  const registerRes = await agent.post("/api/v1/auth/register").send({
    username: `${prefix}_user`,
    email: `${prefix}@example.com`,
    password: "TestPassword123",
  });

  return {
    agent,
    userId: registerRes.body.data.user.id as string,
  };
}

describe("Multi-user isolation integration", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("should isolate platforms and library data between two authenticated users", async () => {
    const userA = await createAuthenticatedAgent("usera");
    const userB = await createAuthenticatedAgent("userb");

    const platformA = await userA.agent.post("/api/v1/platforms").send({
      name: "PC",
      manufacturer: "Various",
    });

    expect(platformA.status).toBe(201);

    const game = await prisma.game.create({
      data: {
        rawgId: 990001,
        title: "Isolation Game",
      },
    });

    const addLibraryA = await userA.agent.post("/api/v1/library").send({
      rawgId: game.rawgId,
      platformId: platformA.body.data.id,
      status: "BACKLOG",
    });

    expect(addLibraryA.status).toBe(201);

    const listPlatformsB = await userB.agent.get("/api/v1/platforms");
    expect(listPlatformsB.status).toBe(200);
    expect(listPlatformsB.body.data).toHaveLength(0);

    const listLibraryB = await userB.agent.get("/api/v1/library");
    expect(listLibraryB.status).toBe(200);
    expect(listLibraryB.body.data.data).toHaveLength(0);

    const updatePlatformFromAUsingB = await userB.agent
      .put(`/api/v1/platforms/${platformA.body.data.id}`)
      .send({ name: "Hacked" });

    expect(updatePlatformFromAUsingB.status).toBe(404);
  });
});
