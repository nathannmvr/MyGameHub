// tests/unit/services/rawg.service.test.ts
// TDD RED -> GREEN: RAWG API client with cache, throttle, and retry.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CacheService } from "../../../src/services/cache.service.js";
import { RawgService } from "../../../src/services/rawg.service.js";

function createJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

describe("RawgService", () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({ defaultTtlSeconds: 60 });
  });

  it("searchGames should return mapped results", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      createJsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 3498,
            slug: "grand-theft-auto-v",
            name: "Grand Theft Auto V",
            background_image: "https://cdn.example/gta-v.jpg",
            released: "2013-09-17",
            genres: [{ name: "Action" }, { name: "Adventure" }],
            platforms: [
              { platform: { name: "PC" } },
              { platform: { name: "PlayStation 5" } },
            ],
            metacritic: 97,
          },
        ],
      })
    );

    const service = new RawgService({
      apiKey: "rawg_test_key",
      cache,
      fetchFn,
      requestDelayMs: 0,
    });

    const result = await service.searchGames("gta", 1, 20);

    expect(result.pagination.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      rawgId: 3498,
      slug: "grand-theft-auto-v",
      title: "Grand Theft Auto V",
      coverUrl: "https://cdn.example/gta-v.jpg",
      releaseDate: "2013-09-17",
      genres: ["Action", "Adventure"],
      platforms: ["PC", "PlayStation 5"],
      metacritic: 97,
    });
  });

  it("searchGames should use cache on second call", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      createJsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 22511,
            slug: "the-legend-of-zelda-breath-of-the-wild",
            name: "The Legend of Zelda: Breath of the Wild",
            background_image: null,
            released: "2017-03-03",
            genres: [{ name: "Adventure" }],
            platforms: [{ platform: { name: "Nintendo Switch" } }],
            metacritic: 97,
          },
        ],
      })
    );

    const service = new RawgService({
      apiKey: "rawg_test_key",
      cache,
      fetchFn,
      requestDelayMs: 0,
    });

    const first = await service.searchGames("zelda", 1, 20);
    const second = await service.searchGames("zelda", 1, 20);

    expect(first.items).toEqual(second.items);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("getGameDetails should return mapped details", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      createJsonResponse({
        id: 3328,
        slug: "the-witcher-3-wild-hunt",
        name: "The Witcher 3: Wild Hunt",
        background_image: "https://cdn.example/witcher3.jpg",
        background_image_additional: "https://cdn.example/witcher3-bg.jpg",
        released: "2015-05-18",
        description_raw: "Geralt searches for Ciri.",
        metacritic: 93,
        developers: [{ name: "CD PROJEKT RED" }],
        publishers: [{ name: "CD PROJEKT" }],
        genres: [{ name: "RPG" }, { name: "Action" }],
        tags: [{ name: "Open World" }, { name: "Story Rich" }],
        platforms: [
          { platform: { name: "PC" } },
          { platform: { name: "PlayStation 5" } },
        ],
      })
    );

    const service = new RawgService({
      apiKey: "rawg_test_key",
      cache,
      fetchFn,
      requestDelayMs: 0,
    });

    const details = await service.getGameDetails(3328);

    expect(details).toEqual({
      rawgId: 3328,
      slug: "the-witcher-3-wild-hunt",
      title: "The Witcher 3: Wild Hunt",
      coverUrl: "https://cdn.example/witcher3.jpg",
      backgroundUrl: "https://cdn.example/witcher3-bg.jpg",
      releaseDate: "2015-05-18",
      description: "Geralt searches for Ciri.",
      metacritic: 93,
      developer: "CD PROJEKT RED",
      publisher: "CD PROJEKT",
      genres: ["RPG", "Action"],
      tags: ["Open World", "Story Rich"],
      platforms: ["PC", "PlayStation 5"],
    });
  });

  it("throttle should respect 200ms interval", async () => {
    let now = 1000;
    const nowFn = vi.fn(() => now);
    const sleepFn = vi.fn(async (ms: number) => {
      now += ms;
    });

    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ count: 0, next: null, previous: null, results: [] })
      );

    const service = new RawgService({
      apiKey: "rawg_test_key",
      cache,
      fetchFn,
      nowFn,
      sleepFn,
      requestDelayMs: 200,
    });

    await service.searchGames("first", 1, 20);
    now = 1100;
    await service.searchGames("second", 1, 20);

    expect(sleepFn).toHaveBeenCalledWith(100);
  });

  it("should retry with backoff when RAWG returns 429", async () => {
    const sleepFn = vi.fn(async () => {});

    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ error: "rate limited" }, 429))
      .mockResolvedValueOnce(
        createJsonResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 4200,
              slug: "portal",
              name: "Portal",
              background_image: null,
              released: "2007-10-09",
              genres: [{ name: "Puzzle" }],
              platforms: [{ platform: { name: "PC" } }],
              metacritic: 90,
            },
          ],
        })
      );

    const service = new RawgService({
      apiKey: "rawg_test_key",
      cache,
      fetchFn,
      sleepFn,
      requestDelayMs: 0,
      maxRetries: 3,
      retryDelayMs: 10,
    });

    const result = await service.searchGames("portal", 1, 20);

    expect(result.items[0].rawgId).toBe(4200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledWith(10);
  });
});
