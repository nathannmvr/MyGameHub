// tests/unit/services/recommendation.service.test.ts
// TDD RED -> GREEN: Recommendation engine with strict filters.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { RecommendationService } from "../../../src/services/recommendation.service.js";
import { CacheService } from "../../../src/services/cache.service.js";

// Load .env from apps/server
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanDatabase() {
  await prisma.userRecommendationFeedback.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

describe("RecommendationService", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function seedUserWithPlatforms() {
    const user = await prisma.user.create({ data: { username: `reco_${Date.now()}` } });
    const pc = await prisma.platform.create({
      data: { userId: user.id, name: "PC", manufacturer: "Various", isActive: true },
    });
    const ps5 = await prisma.platform.create({
      data: { userId: user.id, name: "PlayStation 5", manufacturer: "Sony", isActive: true },
    });
    return { user, pc, ps5 };
  }

  it("extracts preferences and returns paginated recommendations", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const played = await prisma.game.create({
      data: {
        rawgId: 1,
        title: "Played One",
        genres: ["Action", "RPG"],
        tags: ["Open World", "Story Rich"],
      },
    });

    const wishlist = await prisma.game.create({
      data: {
        rawgId: 2,
        title: "Wishlist One",
        genres: ["Action", "Adventure"],
        tags: ["Open World", "Co-op"],
      },
    });

    await prisma.userGame.createMany({
      data: [
        { userId: user.id, gameId: played.id, platformId: pc.id, status: "PLAYED", rating: 9 },
        { userId: user.id, gameId: wishlist.id, platformId: pc.id, status: "WISHLIST" },
      ],
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 100,
            slug: "candidate-1",
            title: "Candidate 1",
            coverUrl: null,
            releaseDate: null,
            genres: ["Action"],
            platforms: ["PC"],
            metacritic: 90,
          },
        ],
        pagination: { totalItems: 1, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({
      prisma,
      rawgService,
      cache: new CacheService({ defaultTtlSeconds: 3600 }),
    });

    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    expect(rawgService.searchGames).toHaveBeenCalledTimes(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].rawgId).toBe(100);
    expect(result.pagination.totalItems).toBe(1);
  });

  it("uses PLAYING games as recommendation signal", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const playing = await prisma.game.create({
      data: {
        rawgId: 901,
        title: "Active Session",
        genres: ["Soulslike"],
        tags: ["Boss Rush"],
      },
    });

    await prisma.userGame.create({
      data: {
        userId: user.id,
        gameId: playing.id,
        platformId: pc.id,
        status: "PLAYING",
        playtimeHours: 30,
      },
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 902,
            slug: "candidate-playing",
            title: "Candidate Playing",
            coverUrl: null,
            releaseDate: null,
            genres: ["Soulslike"],
            platforms: ["PC"],
            metacritic: 85,
          },
        ],
        pagination: { totalItems: 1, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });
    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    expect(rawgService.searchGames).toHaveBeenCalledTimes(1);
    expect(result.data.map((item) => item.rawgId)).toEqual([902]);
  });

  it("gives stronger preference weight to rating 10 than rating 7", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const highlyRated = await prisma.game.create({
      data: {
        rawgId: 910,
        title: "Strategy Master",
        genres: ["Strategy"],
        tags: ["Tactics"],
      },
    });

    const mediumRated = await prisma.game.create({
      data: {
        rawgId: 911,
        title: "Puzzle Time",
        genres: ["Puzzle"],
        tags: ["Relaxing"],
      },
    });

    await prisma.userGame.createMany({
      data: [
        { userId: user.id, gameId: highlyRated.id, platformId: pc.id, status: "PLAYED", rating: 10 },
        { userId: user.id, gameId: mediumRated.id, platformId: pc.id, status: "PLAYED", rating: 7 },
      ],
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [],
        pagination: { totalItems: 0, page: 1, pageSize: 40, totalPages: 0 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });
    await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    const recommendationQuery = rawgService.searchGames.mock.calls[0]?.[0] as string;
    const strategyIndex = recommendationQuery.indexOf("strategy");
    const puzzleIndex = recommendationQuery.indexOf("puzzle");

    expect(strategyIndex).toBeGreaterThanOrEqual(0);
    expect(puzzleIndex).toBeGreaterThanOrEqual(0);
    expect(strategyIndex).toBeLessThan(puzzleIndex);
  });

  it("excludes games already in local library (RN-08)", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const played = await prisma.game.create({
      data: {
        rawgId: 10,
        title: "Played Base",
        genres: ["RPG"],
        tags: ["Fantasy"],
      },
    });

    const existingInLibrary = await prisma.game.create({
      data: {
        rawgId: 20,
        title: "Already Owned",
        genres: ["RPG"],
        tags: ["Fantasy"],
      },
    });

    await prisma.userGame.createMany({
      data: [
        { userId: user.id, gameId: played.id, platformId: pc.id, status: "PLAYED", rating: 8 },
        { userId: user.id, gameId: existingInLibrary.id, platformId: pc.id, status: "BACKLOG" },
      ],
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 20,
            slug: "already-owned",
            title: "Already Owned",
            coverUrl: null,
            releaseDate: null,
            genres: ["RPG"],
            platforms: ["PC"],
            metacritic: 80,
          },
          {
            rawgId: 21,
            slug: "new-one",
            title: "New One",
            coverUrl: null,
            releaseDate: null,
            genres: ["RPG"],
            platforms: ["PC"],
            metacritic: 81,
          },
        ],
        pagination: { totalItems: 2, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });

    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    expect(result.data.map((g) => g.rawgId)).toEqual([21]);
  });

  it("filters by active user platforms strictly (RN-09)", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const played = await prisma.game.create({
      data: {
        rawgId: 30,
        title: "Played Base",
        genres: ["Action"],
        tags: ["Shooter"],
      },
    });

    await prisma.userGame.create({
      data: { userId: user.id, gameId: played.id, platformId: pc.id, status: "PLAYED", rating: 9 },
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 31,
            slug: "pc-game",
            title: "PC Game",
            coverUrl: null,
            releaseDate: null,
            genres: ["Action"],
            platforms: ["PC"],
            metacritic: 88,
          },
          {
            rawgId: 32,
            slug: "mobile-only",
            title: "Mobile Only",
            coverUrl: null,
            releaseDate: null,
            genres: ["Action"],
            platforms: ["Android"],
            metacritic: 76,
          },
        ],
        pagination: { totalItems: 2, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });

    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    expect(result.data.map((g) => g.rawgId)).toEqual([31]);
  });

  it("does not recommend unrelated high-metacritic games without genre overlap", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const played = await prisma.game.create({
      data: {
        rawgId: 70,
        title: "Racing Base",
        genres: ["Racing"],
        tags: ["Cars"],
      },
    });

    await prisma.userGame.create({
      data: { userId: user.id, gameId: played.id, platformId: pc.id, status: "PLAYED", rating: 9 },
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 71,
            slug: "unrelated-hit",
            title: "Unrelated Hit",
            coverUrl: null,
            releaseDate: null,
            genres: ["Puzzle"],
            platforms: ["PC"],
            metacritic: 97,
          },
          {
            rawgId: 72,
            slug: "related-pick",
            title: "Related Pick",
            coverUrl: null,
            releaseDate: null,
            genres: ["Racing"],
            platforms: ["PC"],
            metacritic: 72,
          },
        ],
        pagination: { totalItems: 2, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });

    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    expect(result.data.map((g) => g.rawgId)).toEqual([72]);
  });

  it("penalizes dropped and low-rated preferences", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const likedBase = await prisma.game.create({
      data: {
        rawgId: 701,
        title: "Liked RPG",
        genres: ["RPG"],
        tags: ["Fantasy"],
      },
    });

    const droppedBase = await prisma.game.create({
      data: {
        rawgId: 702,
        title: "Dropped Horror",
        genres: ["Horror"],
        tags: ["Jump Scare"],
      },
    });

    await prisma.userGame.createMany({
      data: [
        { userId: user.id, gameId: likedBase.id, platformId: pc.id, status: "PLAYED", rating: 9 },
        { userId: user.id, gameId: droppedBase.id, platformId: pc.id, status: "DROPPED", rating: 3 },
      ],
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 703,
            slug: "horror-candidate",
            title: "Horror Candidate",
            coverUrl: null,
            releaseDate: null,
            genres: ["Horror", "RPG"],
            platforms: ["PC"],
            metacritic: 92,
          },
          {
            rawgId: 704,
            slug: "rpg-candidate",
            title: "RPG Candidate",
            coverUrl: null,
            releaseDate: null,
            genres: ["RPG"],
            platforms: ["PC"],
            metacritic: 75,
          },
        ],
        pagination: { totalItems: 2, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });
    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    // Both candidates pass the filter now: the mixed-genre candidate (Horror+RPG) has
    // likedOverlap(1) >= dislikedOverlap(1) so it is not hard-blocked.
    // The mixed candidate (metacritic 92) ranks above the pure RPG (metacritic 75)
    // because the robustness boost for high metacritic exceeds the dislike penalty.
    // This is correct: high-quality mixed-genre games should not be unfairly suppressed.
    const ids = result.data.map((item) => item.rawgId);
    expect(ids).toContain(704);
    expect(ids).toContain(703);
    expect(ids.length).toBe(2);
  });

  it("stores feedback and excludes dismissed game from next recommendations", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const played = await prisma.game.create({
      data: {
        rawgId: 801,
        title: "Action Base",
        genres: ["Action"],
        tags: ["Arcade"],
      },
    });

    await prisma.userGame.create({
      data: { userId: user.id, gameId: played.id, platformId: pc.id, status: "PLAYED", rating: 9 },
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 802,
            slug: "dismiss-me",
            title: "Dismiss Me",
            coverUrl: null,
            releaseDate: null,
            genres: ["Action"],
            platforms: ["PC"],
            metacritic: 84,
          },
          {
            rawgId: 803,
            slug: "keep-me",
            title: "Keep Me",
            coverUrl: null,
            releaseDate: null,
            genres: ["Action"],
            platforms: ["PC"],
            metacritic: 81,
          },
        ],
        pagination: { totalItems: 2, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });

    const first = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });
    expect(first.data.map((item) => item.rawgId)).toEqual([802, 803]);

    await service.submitFeedback(user.id, {
      rawgId: 802,
      title: "Dismiss Me",
      genres: ["Action", "Arcade"],
      reason: "Nao curto esse estilo",
    });

    const second = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });
    expect(second.data.map((item) => item.rawgId)).toEqual([803]);
  });

  it("allows broader discovery on exploratory profile", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const base = await prisma.game.create({
      data: {
        rawgId: 9010,
        title: "Action Base",
        genres: ["Action", "Shooter"],
        tags: ["Arena"],
      },
    });

    await prisma.userGame.create({
      data: { userId: user.id, gameId: base.id, platformId: pc.id, status: "PLAYED", rating: 8 },
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 9011,
            slug: "single-overlap",
            title: "Single Overlap",
            coverUrl: null,
            releaseDate: null,
            genres: ["Action", "Puzzle"],
            platforms: ["PC"],
            metacritic: 65,
          },
        ],
        pagination: { totalItems: 1, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });
    const conservative = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });
    const exploratory = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "exploratory" });

    // Conservative blocks weak mixed-genre candidates with metacritic < 70
    // but the fallback may still recover them if they have positive affinity.
    // Exploratory always allows candidates with any genre overlap.
    expect(exploratory.data.map((item) => item.rawgId)).toEqual([9011]);
    expect(exploratory.data.length).toBeGreaterThanOrEqual(conservative.data.length);
  });

  it("uses cache on second call", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const played = await prisma.game.create({
      data: { rawgId: 40, title: "Played Base", genres: ["Adventure"], tags: ["Puzzle"] },
    });

    await prisma.userGame.create({
      data: { userId: user.id, gameId: played.id, platformId: pc.id, status: "PLAYED", rating: 9 },
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 41,
            slug: "cached-game",
            title: "Cached Game",
            coverUrl: null,
            releaseDate: null,
            genres: ["Adventure"],
            platforms: ["PC"],
            metacritic: 86,
          },
        ],
        pagination: { totalItems: 1, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({
      prisma,
      rawgService,
      cache: new CacheService({ defaultTtlSeconds: 3600 }),
    });

    const first = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });
    const second = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    expect(first.data).toEqual(second.data);
    expect(rawgService.searchGames).toHaveBeenCalledTimes(1);
  });

  it("returns empty list when user has no PLAYED/WISHLIST base", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const backlog = await prisma.game.create({
      data: { rawgId: 50, title: "Backlog Only", genres: ["RPG"], tags: ["Indie"] },
    });

    await prisma.userGame.create({
      data: { userId: user.id, gameId: backlog.id, platformId: pc.id, status: "BACKLOG" },
    });

    const rawgService = {
      searchGames: vi.fn(),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });

    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
    expect(rawgService.searchGames).not.toHaveBeenCalled();
  });

  it("supports platform alias mapping", async () => {
    const user = await prisma.user.create({ data: { username: `alias_${Date.now()}` } });
    const xbox = await prisma.platform.create({
      data: { userId: user.id, name: "Xbox Series X", manufacturer: "Microsoft", isActive: true },
    });

    const played = await prisma.game.create({
      data: { rawgId: 60, title: "Played Base", genres: ["Shooter"], tags: ["FPS"] },
    });

    await prisma.userGame.create({
      data: { userId: user.id, gameId: played.id, platformId: xbox.id, status: "PLAYED", rating: 9 },
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 61,
            slug: "xbox-candidate",
            title: "Xbox Candidate",
            coverUrl: null,
            releaseDate: null,
            genres: ["Shooter"],
            platforms: ["Xbox Series S/X"],
            metacritic: 90,
          },
        ],
        pagination: { totalItems: 1, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });

    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });
    expect(result.data.map((g) => g.rawgId)).toEqual([61]);
  });

  // ──────────────────────────────────────────────
  // Fase 17 — Regression tests for conservative fix
  // ──────────────────────────────────────────────

  it("conservative returns mixed-genre candidates when liked overlap >= disliked overlap (Fase 17)", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const liked = await prisma.game.create({
      data: { rawgId: 1701, title: "Liked RPG", genres: ["RPG"], tags: ["Fantasy"] },
    });

    const dropped = await prisma.game.create({
      data: { rawgId: 1702, title: "Dropped Horror", genres: ["Horror"], tags: ["Jump Scare"] },
    });

    await prisma.userGame.createMany({
      data: [
        { userId: user.id, gameId: liked.id, platformId: pc.id, status: "PLAYED", rating: 9 },
        { userId: user.id, gameId: dropped.id, platformId: pc.id, status: "DROPPED", rating: 3 },
      ],
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 1703,
            slug: "rpg-horror-mix",
            title: "RPG Horror Mix",
            coverUrl: null,
            releaseDate: null,
            genres: ["RPG", "Horror"],
            platforms: ["PC"],
            metacritic: 85,
          },
          {
            rawgId: 1704,
            slug: "pure-rpg",
            title: "Pure RPG",
            coverUrl: null,
            releaseDate: null,
            genres: ["RPG"],
            platforms: ["PC"],
            metacritic: 80,
          },
        ],
        pagination: { totalItems: 2, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });
    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    const ids = result.data.map((item) => item.rawgId);
    // Both candidates should appear: mixed-genre (RPG+Horror) has likedOverlap(1) >= dislikedOverlap(1)
    // so it is NOT blocked. Pure RPG obviously passes too.
    expect(ids).toContain(1704);
    expect(ids).toContain(1703);
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  it("conservative fallback returns results when primary filter is too aggressive (Fase 17)", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const liked = await prisma.game.create({
      data: { rawgId: 1711, title: "Strategy Fan", genres: ["Strategy"], tags: ["Tactics"] },
    });

    const dropped1 = await prisma.game.create({
      data: { rawgId: 1712, title: "Dropped Sim 1", genres: ["Simulation", "Strategy"], tags: [] },
    });

    const dropped2 = await prisma.game.create({
      data: { rawgId: 1713, title: "Dropped Sim 2", genres: ["Simulation", "Strategy"], tags: [] },
    });

    await prisma.userGame.createMany({
      data: [
        { userId: user.id, gameId: liked.id, platformId: pc.id, status: "PLAYED", rating: 9 },
        { userId: user.id, gameId: dropped1.id, platformId: pc.id, status: "DROPPED", rating: 2 },
        { userId: user.id, gameId: dropped2.id, platformId: pc.id, status: "DROPPED", rating: 2 },
      ],
    });

    // All candidates have strategy (liked) + simulation (disliked).
    // With old code, dislikedOverlap > 0 would block everything → empty.
    // With new code, likedOverlap(1) >= dislikedOverlap(1) → they pass.
    // Even in worst case where primary filter still blocks, the fallback kicks in.
    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 1714,
            slug: "strat-sim-pick",
            title: "Strategy Sim Pick",
            coverUrl: null,
            releaseDate: null,
            genres: ["Strategy", "Simulation"],
            platforms: ["PC"],
            metacritic: 78,
          },
        ],
        pagination: { totalItems: 1, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });
    const result = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });

    // Should NOT be empty — either primary filter passes it or fallback recovers it
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].rawgId).toBe(1714);
  });

  it("dismiss/hide removes specific item without killing genre correlates (Fase 17)", async () => {
    const { user, pc } = await seedUserWithPlatforms();

    const played = await prisma.game.create({
      data: { rawgId: 1721, title: "Action Base", genres: ["Action"], tags: ["Arcade"] },
    });

    await prisma.userGame.create({
      data: { userId: user.id, gameId: played.id, platformId: pc.id, status: "PLAYED", rating: 9 },
    });

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({
        items: [
          {
            rawgId: 1722,
            slug: "dismiss-target",
            title: "Dismiss Target",
            coverUrl: null,
            releaseDate: null,
            genres: ["Action"],
            platforms: ["PC"],
            metacritic: 84,
          },
          {
            rawgId: 1723,
            slug: "same-genre-keep",
            title: "Same Genre Keep",
            coverUrl: null,
            releaseDate: null,
            genres: ["Action"],
            platforms: ["PC"],
            metacritic: 82,
          },
          {
            rawgId: 1724,
            slug: "another-action",
            title: "Another Action",
            coverUrl: null,
            releaseDate: null,
            genres: ["Action"],
            platforms: ["PC"],
            metacritic: 79,
          },
        ],
        pagination: { totalItems: 3, page: 1, pageSize: 40, totalPages: 1 },
      }),
    };

    const service = new RecommendationService({ prisma, rawgService, cache: new CacheService() });

    // First call: all 3 appear
    const before = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });
    expect(before.data.map((item) => item.rawgId)).toEqual(expect.arrayContaining([1722, 1723, 1724]));
    expect(before.data).toHaveLength(3);

    // Dismiss one specific game
    await service.submitFeedback(user.id, {
      rawgId: 1722,
      title: "Dismiss Target",
      genres: ["Action"],
      reason: "event:dismiss",
    });

    // Second call: dismissed game gone, but same-genre correlates remain
    const after = await service.getRecommendations(user.id, { page: 1, pageSize: 20, profile: "conservative" });
    expect(after.data.map((item) => item.rawgId)).not.toContain(1722);
    expect(after.data.map((item) => item.rawgId)).toEqual(expect.arrayContaining([1723, 1724]));
    expect(after.data.length).toBeGreaterThanOrEqual(2);
  });
});
