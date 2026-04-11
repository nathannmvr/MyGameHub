// src/services/steam.service.ts
// Steam Web API client for owned games retrieval.

import { AppError } from "../middleware/error-handler.js";

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface SteamOwnedGame {
  appId: number;
  name: string;
  playtimeForever: number;
  iconUrl: string | null;
  lastPlayedAt: Date | null;
}

export interface SteamOwnedGamesResult {
  total: number;
  games: SteamOwnedGame[];
}

interface SteamApiResponse {
  response?: {
    game_count?: number;
    games?: Array<{
      appid: number;
      name?: string;
      playtime_forever?: number;
      img_icon_url?: string;
      rtime_last_played?: number;
    }>;
  };
}

export interface SteamServiceOptions {
  apiKey?: string;
  fetchFn?: FetchFn;
  baseUrl?: string;
  fixtureGames?: SteamOwnedGame[];
}

export class SteamService {
  private readonly apiKey: string;
  private readonly fetchFn: FetchFn;
  private readonly baseUrl: string;
  private readonly fixtureGames: SteamOwnedGame[];

  constructor(options: SteamServiceOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.STEAM_API_KEY ?? "";
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? "https://api.steampowered.com";
    this.fixtureGames =
      options.fixtureGames ??
      [
        {
          appId: 292030,
          name: "The Witcher 3: Wild Hunt",
          playtimeForever: 220,
          iconUrl: null,
          lastPlayedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        },
        {
          appId: 1174180,
          name: "Red Dead Redemption 2",
          playtimeForever: 120,
          iconUrl: null,
          lastPlayedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        },
        { appId: 620, name: "Portal 2", playtimeForever: 0, iconUrl: null, lastPlayedAt: null },
        {
          appId: 1085660,
          name: "Destiny 2",
          playtimeForever: 15,
          iconUrl: null,
          lastPlayedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        },
      ];
  }

  private shouldUseFixtureMode(): boolean {
    if (process.env.NODE_ENV === "production") {
      return false;
    }

    const normalizedKey = this.apiKey.trim();

    if (!normalizedKey) {
      return true;
    }

    return /^(test_|your_|example_|changeme)/i.test(normalizedKey);
  }

  private async readErrorBody(response: Response): Promise<string | null> {
    try {
      const body = await response.clone().text();
      const trimmed = body.trim();

      return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
    } catch {
      return null;
    }
  }

  async getOwnedGames(steamId: string): Promise<SteamOwnedGamesResult> {
    if (!/^\d{17}$/.test(steamId)) {
      throw new AppError("STEAM_INVALID_ID", "Steam ID must be a 17-digit number", 400);
    }

    // Local/dev fallback: keep sync flow testable without a real Steam Web API key.
    if (this.shouldUseFixtureMode()) {
      return {
        total: this.fixtureGames.length,
        games: this.fixtureGames,
      };
    }

    if (!this.apiKey.trim()) {
      throw new AppError("STEAM_API_KEY_MISSING", "Steam API key is not configured", 500);
    }

    const url = new URL("/IPlayerService/GetOwnedGames/v1/", this.baseUrl);
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("steamid", steamId);
    url.searchParams.set("include_appinfo", "true");
    url.searchParams.set("include_played_free_games", "true");
    url.searchParams.set("format", "json");

    const response = await this.fetchFn(url.toString());

    if (!response.ok) {
      const errorBody = await this.readErrorBody(response);

      if (response.status === 401) {
        throw new AppError(
          "STEAM_API_UNAUTHORIZED",
          "Steam API rejected the configured key (401). Verify STEAM_API_KEY and the Steam Web API permissions.",
          502,
          {
            steamId,
            status: response.status,
            body: errorBody,
          }
        );
      }

      throw new AppError(
        "STEAM_API_ERROR",
        `Steam API request failed with status ${response.status}`,
        502,
        {
          steamId,
          status: response.status,
          body: errorBody,
        }
      );
    }

    const payload = (await response.json()) as SteamApiResponse;
    const games = payload.response?.games;

    if (!games) {
      throw new AppError(
        "STEAM_PROFILE_PRIVATE",
        "Steam profile is private or has no visible game library",
        400
      );
    }

    return {
      total: payload.response?.game_count ?? games.length,
      games: games.map((game) => ({
        appId: game.appid,
        name: game.name ?? `App ${game.appid}`,
        playtimeForever: game.playtime_forever ?? 0,
        iconUrl:
          game.img_icon_url && game.img_icon_url.trim().length > 0
            ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
            : null,
        lastPlayedAt:
          game.rtime_last_played && game.rtime_last_played > 0
            ? new Date(game.rtime_last_played * 1000)
            : null,
      })),
    };
  }
}
