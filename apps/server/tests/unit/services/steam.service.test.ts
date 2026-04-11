// tests/unit/services/steam.service.test.ts
// TDD RED -> GREEN: Steam API client behavior.

import { describe, it, expect, vi } from "vitest";
import { SteamService } from "../../../src/services/steam.service.js";
import { AppError } from "../../../src/middleware/error-handler.js";

function createResponse(data: unknown, status = 200) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);

  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => (typeof data === "string" ? JSON.parse(data) : data),
    text: async () => payload,
    clone: () => response,
  } as Response;

  return response;
}

function jsonResponse(data: unknown, status = 200) {
  return createResponse(data, status);
}

function textResponse(body: string, status = 200) {
  return createResponse(body, status);
}

describe("SteamService", () => {
  it("placeholder api keys should use local fixture fallback instead of calling Steam", async () => {
    const fetchFn = vi.fn();
    const service = new SteamService({ apiKey: "test_steam_key", fetchFn });

    const result = await service.getOwnedGames("76561198000000000");

    expect(result.total).toBeGreaterThan(0);
    expect(result.games).toHaveLength(result.total);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("getOwnedGames should return owned games list", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        response: {
          game_count: 2,
          games: [
            { appid: 570, name: "Dota 2", playtime_forever: 12500, img_icon_url: "a" },
            {
              appid: 730,
              name: "Counter-Strike 2",
              playtime_forever: 8000,
              img_icon_url: "b",
              rtime_last_played: 1711584000,
            },
          ],
        },
      })
    );

    const service = new SteamService({ apiKey: "steam_test_key", fetchFn });
    const result = await service.getOwnedGames("76561198000000000");

    expect(result.total).toBe(2);
    expect(result.games).toHaveLength(2);
    expect(result.games[0].appId).toBe(570);
    expect(result.games[1].playtimeForever).toBe(8000);
    expect(result.games[0].lastPlayedAt).toBeNull();
    expect(result.games[1].lastPlayedAt).toBeInstanceOf(Date);
  });

  it("steam 401 should throw STEAM_API_UNAUTHORIZED with diagnostic details", async () => {
    const fetchFn = vi.fn().mockResolvedValue(textResponse("Unauthorized", 401));

    const service = new SteamService({ apiKey: "real_steam_key", fetchFn });

    await expect(service.getOwnedGames("76561198000000000")).rejects.toMatchObject({
      code: "STEAM_API_UNAUTHORIZED",
      statusCode: 502,
    } satisfies Partial<AppError>);
  });

  it("private profile should throw STEAM_PROFILE_PRIVATE", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ response: {} }, 200));

    const service = new SteamService({ apiKey: "steam_test_key", fetchFn });

    await expect(service.getOwnedGames("76561198000000000")).rejects.toMatchObject({
      code: "STEAM_PROFILE_PRIVATE",
    } satisfies Partial<AppError>);
  });

  it("invalid steam ID should throw STEAM_INVALID_ID", async () => {
    const service = new SteamService({ apiKey: "steam_test_key", fetchFn: vi.fn() });

    await expect(service.getOwnedGames("123")).rejects.toMatchObject({
      code: "STEAM_INVALID_ID",
    } satisfies Partial<AppError>);
  });
});
