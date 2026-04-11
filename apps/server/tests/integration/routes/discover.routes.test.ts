// tests/integration/routes/discover.routes.test.ts

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

const searchGamesMock = vi.fn();

vi.mock("../../../src/services/rawg.service.js", () => ({
  RawgService: vi.fn().mockImplementation(() => ({
    searchGames: searchGamesMock,
  })),
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

describe("Discover Routes Integration", () => {
  let authAgent: ReturnType<typeof request.agent>;
  let user: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    searchGamesMock.mockReset();

    authAgent = request.agent(app);
    const registerRes = await authAgent.post("/api/v1/auth/register").send({
      username: "discover_integration_user",
      email: "discover_integration_user@example.com",
      password: "TestPassword123",
    });
    user = { id: registerRes.body.data.user.id };

    const pc = await prisma.platform.create({
      data: {
        userId: user.id,
        name: "PC",
        manufacturer: "Various",
        isActive: true,
      },
    });

    const played = await prisma.game.create({
      data: {
        rawgId: 1000,
        title: "Played Base",
        genres: ["Action"],
        tags: ["Open World"],
      },
    });

    await prisma.userGame.create({
      data: { userId: user.id, gameId: played.id, platformId: pc.id, status: "PLAYED", rating: 9 },
    });

    searchGamesMock.mockResolvedValue({
      items: [
        {
          rawgId: 2001,
          slug: "pc-candidate",
          title: "PC Candidate",
          coverUrl: null,
          releaseDate: null,
          genres: ["Action"],
          platforms: ["PC"],
          metacritic: 88,
        },
      ],
      pagination: { totalItems: 1, page: 1, pageSize: 40, totalPages: 1 },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("GET /api/v1/discover returns recommendations", async () => {
    const res = await authAgent.get("/api/v1/discover?page=1&pageSize=20");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
