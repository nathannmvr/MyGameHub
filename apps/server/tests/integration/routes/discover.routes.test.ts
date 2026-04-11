// tests/integration/routes/discover.routes.test.ts
// TDD RED -> GREEN: Discover endpoint with strict recommendation filters.

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

// Load .env from apps/server
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = createApp();

async function cleanDatabase() {
  await prisma.userRecommendationFeedback.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

async function getDefaultUser() {
  const existing = await prisma.user.findFirst();
  if (existing) return existing;
  return prisma.user.create({ data: { username: "discover_integration_user" } });
}

describe("Discover Routes Integration", () => {
  let user: { id: string };
  let pc: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    searchGamesMock.mockReset();

    user = await getDefaultUser();
    pc = await prisma.platform.create({
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

    const owned = await prisma.game.create({
      data: {
        rawgId: 2000,
        title: "Owned Candidate",
        genres: ["Action"],
        tags: ["Open World"],
      },
    });

    await prisma.userGame.createMany({
      data: [
        { userId: user.id, gameId: played.id, platformId: pc.id, status: "PLAYED", rating: 9 },
        { userId: user.id, gameId: owned.id, platformId: pc.id, status: "BACKLOG" },
      ],
    });

    searchGamesMock.mockResolvedValue({
      items: [
        {
          rawgId: 2000,
          slug: "owned-candidate",
          title: "Owned Candidate",
          coverUrl: null,
          releaseDate: null,
          genres: ["Action"],
          platforms: ["PC"],
          metacritic: 80,
        },
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
        {
          rawgId: 2002,
          slug: "mobile-candidate",
          title: "Mobile Candidate",
          coverUrl: null,
          releaseDate: null,
          genres: ["Action"],
          platforms: ["Android"],
          metacritic: 77,
        },
      ],
      pagination: { totalItems: 3, page: 1, pageSize: 40, totalPages: 1 },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("GET /api/v1/discover returns paginated recommendations", async () => {
    const res = await request(app).get("/api/v1/discover?page=1&pageSize=20");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.pagination.totalItems).toBe(1);
  });

  it("GET /api/v1/discover excludes games already in library", async () => {
    const res = await request(app).get("/api/v1/discover?page=1&pageSize=20");
    const rawgIds = res.body.data.data.map((g: { rawgId: number }) => g.rawgId);

    expect(rawgIds).not.toContain(2000);
  });

  it("GET /api/v1/discover respects user active platforms", async () => {
    const res = await request(app).get("/api/v1/discover?page=1&pageSize=20");
    const rawgIds = res.body.data.data.map((g: { rawgId: number }) => g.rawgId);

    expect(rawgIds).toEqual([2001]);
  });

  it("POST /api/v1/discover/feedback stores dismissal and removes it from recommendations", async () => {
    const dismissRes = await request(app)
      .post("/api/v1/discover/feedback")
      .send({
        rawgId: 2001,
        title: "PC Candidate",
        genres: ["Action"],
        reason: "Nao tenho interesse",
      });

    expect(dismissRes.status).toBe(201);
    expect(dismissRes.body.success).toBe(true);
    expect(dismissRes.body.data.dismissed).toBe(true);

    const discoverRes = await request(app).get("/api/v1/discover?page=1&pageSize=20");
    const rawgIds = discoverRes.body.data.data.map((g: { rawgId: number }) => g.rawgId);

    expect(rawgIds).not.toContain(2001);
  });
});
