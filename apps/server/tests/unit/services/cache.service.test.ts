// tests/unit/services/cache.service.test.ts
// TDD RED -> GREEN: Cache service behavior (memory adapter baseline)

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CacheService } from "../../../src/services/cache.service.js";

describe("CacheService", () => {
  let cache: CacheService;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new CacheService({ defaultTtlSeconds: 60 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("set + get should return stored value", async () => {
    await cache.set("games:search:zelda:1", { items: ["Zelda"] }, 300);

    const value = await cache.get<{ items: string[] }>("games:search:zelda:1");

    expect(value).toEqual({ items: ["Zelda"] });
  });

  it("get should return null after TTL expires", async () => {
    await cache.set("games:detail:3498", { id: 3498 }, 1);

    vi.advanceTimersByTime(1001);

    const value = await cache.get<{ id: number }>("games:detail:3498");

    expect(value).toBeNull();
  });

  it("del should remove key", async () => {
    await cache.set("rawg:search:hades:1", { ok: true }, 60);

    await cache.del("rawg:search:hades:1");

    const value = await cache.get<{ ok: boolean }>("rawg:search:hades:1");
    expect(value).toBeNull();
  });

  it("flush should remove matching keys by pattern", async () => {
    await cache.set("rawg:search:zelda:1", { id: 1 }, 60);
    await cache.set("rawg:search:mario:1", { id: 2 }, 60);
    await cache.set("rawg:detail:3498", { id: 3498 }, 60);

    await cache.flush("rawg:search:*");

    const searchA = await cache.get("rawg:search:zelda:1");
    const searchB = await cache.get("rawg:search:mario:1");
    const detail = await cache.get("rawg:detail:3498");

    expect(searchA).toBeNull();
    expect(searchB).toBeNull();
    expect(detail).toEqual({ id: 3498 });
  });
});
