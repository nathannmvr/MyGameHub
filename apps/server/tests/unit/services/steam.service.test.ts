// tests/unit/services/steam.service.test.ts
// TDD RED -> GREEN: Steam API client behavior.

import { describe, it, expect, vi } from "vitest";
import { SteamService } from "../../../src/services/steam.service.js";
import { AppError } from "../../../src/middleware/error-handler.js";

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

describe("SteamService", () => {
  it("getOwnedGames should return owned games list", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        response: {
          game_count: 2,
          games: [
            { appid: 570, name: "Dota 2", playtime_forever: 12500, img_icon_url: "a" },
            { appid: 730, name: "Counter-Strike 2", playtime_forever: 8000, img_icon_url: "b" },
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
