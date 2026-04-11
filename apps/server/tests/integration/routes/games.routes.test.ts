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
  return prisma.user.create({ data: { username: "testuser_games_integration" } });
}

describe("Games Routes Integration", () => {
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

    defaultUser = await getDefaultUser();
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
        {
          rawgId: 4200,
          slug: "portal",
          title: "Portal",
          coverUrl: null,
          releaseDate: "2007-10-09",
          genres: ["Puzzle"],
          platforms: ["PC"],
          metacritic: 90,
        },
      ],
      pagination: {
        totalItems: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });

    const res = await request(app).get("/api/v1/games/search?q=zelda");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.data[0].alreadyInLibrary).toBe(true);
    expect(res.body.data.data[1].alreadyInLibrary).toBe(false);
    expect(res.body.data.pagination.totalItems).toBe(2);

    const persistedGame = await prisma.game.findUnique({ where: { rawgId: 4200 } });
    expect(persistedGame).not.toBeNull();
    expect(persistedGame?.title).toBe("Portal");
  });

  it("GET /api/v1/games/search without q should return 400", async () => {
    const res = await request(app).get("/api/v1/games/search");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/v1/games/:rawgId should return game details", async () => {
    getGameDetailsMock.mockResolvedValue({
      rawgId: 3498,
      slug: "grand-theft-auto-v",
      title: "Grand Theft Auto V",
      coverUrl: "https://cdn.example/gta-v.jpg",
      backgroundUrl: "https://cdn.example/gta-v-bg.jpg",
      releaseDate: "2013-09-17",
      description: "Open world action-adventure game.",
      metacritic: 97,
      developer: "Rockstar North",
      publisher: "Rockstar Games",
      genres: ["Action", "Adventure"],
      tags: ["Open World", "Multiplayer"],
      platforms: ["PC", "PlayStation 5"],
    });

    const res = await request(app).get("/api/v1/games/3498");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rawgId).toBe(3498);
    expect(res.body.data.title).toBe("Grand Theft Auto V");
  });
});
