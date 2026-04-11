// tests/integration/routes/games.routes.test.ts
// TDD RED -> GREEN: Games search and details endpoints.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

const searchGamesMock = vi.fn();
const getGameDetailsMock = vi.fn();

vi.mock("../../../src/services/rawg.service.js", () => ({
  RawgService: vi.fn().mockImplementation(() => ({
    searchGames: searchGamesMock,
    getGameDetails: getGameDetailsMock,
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

describe("Games Routes Integration", () => {
  let authAgent: ReturnType<typeof request.agent>;
  let defaultUser: { id: string };
  let defaultPlatform: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    searchGamesMock.mockReset();
    getGameDetailsMock.mockReset();

    authAgent = request.agent(app);
    const registerRes = await authAgent.post("/api/v1/auth/register").send({
      username: "testuser_games_integration",
      email: "testuser_games_integration@example.com",
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

    const existingGame = await prisma.game.create({
      data: {
        rawgId: 22511,
        rawgSlug: "the-legend-of-zelda-breath-of-the-wild",
        title: "The Legend of Zelda: Breath of the Wild",
      },
    });

    await prisma.userGame.create({
      data: {
        userId: defaultUser.id,
        gameId: existingGame.id,
        platformId: defaultPlatform.id,
        status: "BACKLOG",
      },
    });
  });

  it("GET /api/v1/games/search?q=zelda should return results with alreadyInLibrary", async () => {
    searchGamesMock.mockResolvedValue({
      items: [
        {
          rawgId: 22511,
          slug: "the-legend-of-zelda-breath-of-the-wild",
          title: "The Legend of Zelda: Breath of the Wild",
          coverUrl: null,
          releaseDate: "2017-03-03",
          genres: ["Adventure"],
          platforms: ["Nintendo Switch"],
          metacritic: 97,
        },
      ],
      pagination: {
        totalItems: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });

    const res = await authAgent.get("/api/v1/games/search?q=zelda");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data[0].alreadyInLibrary).toBe(true);
  });
});
