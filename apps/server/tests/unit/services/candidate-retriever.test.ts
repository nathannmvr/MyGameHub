// tests/unit/services/candidate-retriever.test.ts
// TDD tests for multi-source candidate retrieval (Fase 16.2)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CandidateRetriever } from "../../../src/services/candidate-retriever.js";

describe("CandidateRetriever", () => {
  const createMockPrisma = () => ({
    userGame: {
      findMany: vi.fn(),
    },
    game: {
      findMany: vi.fn(),
    },
  });

  const createMockCache = () => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    flush: vi.fn(),
  });

  const createMockRawg = () => ({
    searchGames: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affinityBasedCandidates should enforce RN-01 and RN-08 filters", async () => {
    const prisma = createMockPrisma();
    const cache = createMockCache();
    const rawg = createMockRawg();

    prisma.userGame.findMany.mockResolvedValue([{ game: { rawgId: 10 } }]);
    rawg.searchGames.mockResolvedValue({
      items: [
        {
          rawgId: 10,
          title: "Already Owned",
          genres: ["RPG"],
          platforms: ["PC"],
          releaseDate: "2025-01-10",
          metacritic: 81,
          slug: "already-owned",
          coverUrl: null,
        },
        {
          rawgId: 11,
          title: "Wrong Platform",
          genres: ["RPG"],
          platforms: ["PlayStation 5"],
          releaseDate: "2025-01-10",
          metacritic: 85,
          slug: "wrong-platform",
          coverUrl: null,
        },
        {
          rawgId: 12,
          title: "Valid Candidate",
          genres: ["RPG"],
          platforms: ["PC"],
          releaseDate: "2025-01-12",
          metacritic: 88,
          slug: "valid",
          coverUrl: null,
        },
      ],
    });

    const retriever = new CandidateRetriever({
      prisma: prisma as any,
      cache: cache as any,
      rawgService: rawg as any,
    });

    const result = await retriever.affinityBasedCandidates(
      "user-1",
      ["RPG", "Action"],
      ["PC"],
      100
    );

    expect(result.map((item) => item.rawgId)).toEqual([12]);
  });

  it("itemItemSimilarity should rank by Jaccard similarity", async () => {
    const prisma = createMockPrisma();
    const cache = createMockCache();
    const rawg = createMockRawg();

    // First call: library ids
    prisma.userGame.findMany.mockResolvedValueOnce([{ game: { rawgId: 999 } }]);
    // Second call: seeds (PLAYING/PLAYED)
    prisma.userGame.findMany.mockResolvedValueOnce([
      { game: { genres: ["rpg", "action"] } },
      { game: { genres: ["strategy"] } },
    ]);

    prisma.game.findMany.mockResolvedValue([
      {
        rawgId: 21,
        title: "High Similarity",
        genres: ["rpg", "action"],
        platforms: ["PC"],
        releaseDate: new Date("2025-01-01"),
        metacritic: 80,
      },
      {
        rawgId: 22,
        title: "Low Similarity",
        genres: ["puzzle"],
        platforms: ["PC"],
        releaseDate: new Date("2025-01-01"),
        metacritic: 95,
      },
    ]);

    const retriever = new CandidateRetriever({
      prisma: prisma as any,
      cache: cache as any,
      rawgService: rawg as any,
    });

    const result = await retriever.itemItemSimilarity("user-1", ["PC"], 10);

    expect(result).toHaveLength(1);
    expect(result[0].rawgId).toBe(21);
  });

  it("newReleaseMatch should keep only recent releases matching platform and genre", async () => {
    const prisma = createMockPrisma();
    const cache = createMockCache();
    const rawg = createMockRawg();

    prisma.game.findMany.mockResolvedValue([
      {
        rawgId: 31,
        title: "Recent Match",
        genres: ["RPG"],
        platforms: ["PC"],
        releaseDate: new Date(),
        metacritic: 82,
      },
      {
        rawgId: 32,
        title: "Platform Mismatch",
        genres: ["RPG"],
        platforms: ["PlayStation 5"],
        releaseDate: new Date(),
        metacritic: 85,
      },
      {
        rawgId: 33,
        title: "Genre Mismatch",
        genres: ["Sports"],
        platforms: ["PC"],
        releaseDate: new Date(),
        metacritic: 75,
      },
    ]);

    const retriever = new CandidateRetriever({
      prisma: prisma as any,
      cache: cache as any,
      rawgService: rawg as any,
    });

    const result = await retriever.newReleaseMatch(["RPG"], ["PC"], 10);

    expect(result.map((item) => item.rawgId)).toEqual([31]);
  });

  it("getAllCandidates should deduplicate and aggregate score across sources", async () => {
    const prisma = createMockPrisma();
    const cache = createMockCache();
    const rawg = createMockRawg();

    cache.get.mockResolvedValue(null);

    const retriever = new CandidateRetriever({
      prisma: prisma as any,
      cache: cache as any,
      rawgService: rawg as any,
    });

    vi.spyOn(retriever, "affinityBasedCandidates").mockResolvedValue([
      {
        rawgId: 100,
        slug: 'a',
        title: "A",
        coverUrl: null,
        genres: ["rpg"],
        platforms: ["PC"],
        releaseDate: null,
        metacritic: 80,
      },
      {
        rawgId: 101,
        slug: 'b',
        title: "B",
        coverUrl: null,
        genres: ["rpg"],
        platforms: ["PC"],
        releaseDate: null,
        metacritic: 70,
      },
    ]);

    vi.spyOn(retriever, "itemItemSimilarity").mockResolvedValue([
      {
        rawgId: 100,
        slug: 'a',
        title: "A",
        coverUrl: null,
        genres: ["rpg"],
        platforms: ["PC"],
        releaseDate: null,
        metacritic: 80,
      },
      {
        rawgId: 102,
        slug: 'c',
        title: "C",
        coverUrl: null,
        genres: ["strategy"],
        platforms: ["PC"],
        releaseDate: null,
        metacritic: 90,
      },
    ]);

    vi.spyOn(retriever, "trendingByPlatform").mockResolvedValue([]);
    vi.spyOn(retriever, "newReleaseMatch").mockResolvedValue([]);

    const merged = await retriever.getAllCandidates("user-1", ["RPG"], ["PC"]);

    // 100 appears in two sources, then single-source ties are resolved by metacritic (102 > 101)
    expect(merged.map((item) => item.rawgId)).toEqual([100, 102, 101]);
    expect(cache.set).toHaveBeenCalledOnce();
  });

  it("getAllCandidates should return cached value when available", async () => {
    const prisma = createMockPrisma();
    const cache = createMockCache();
    const rawg = createMockRawg();

    cache.get.mockResolvedValue([
      {
        rawgId: 777,
        slug: 'from-cache',
        title: "From Cache",
        coverUrl: null,
        genres: ["rpg"],
        platforms: ["PC"],
        releaseDate: null,
        metacritic: 90,
      },
    ]);

    const retriever = new CandidateRetriever({
      prisma: prisma as any,
      cache: cache as any,
      rawgService: rawg as any,
    });

    const affinitySpy = vi.spyOn(retriever, "affinityBasedCandidates");

    const merged = await retriever.getAllCandidates("user-1", ["RPG"], ["PC"]);

    expect(merged.map((item) => item.rawgId)).toEqual([777]);
    expect(affinitySpy).not.toHaveBeenCalled();
  });
});
