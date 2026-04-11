// src/services/steam.service.ts
// Steam Web API client for owned games retrieval.

import { AppError } from "../middleware/error-handler.js";

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface SteamOwnedGame {
  appId: number;
  name: string;
  playtimeForever: number;
  iconUrl: string | null;
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
        { appId: 292030, name: "The Witcher 3: Wild Hunt", playtimeForever: 220, iconUrl: null },
        { appId: 1174180, name: "Red Dead Redemption 2", playtimeForever: 120, iconUrl: null },
        { appId: 620, name: "Portal 2", playtimeForever: 0, iconUrl: null },
        { appId: 1085660, name: "Destiny 2", playtimeForever: 15, iconUrl: null },
      ];
  }

  async getOwnedGames(steamId: string): Promise<SteamOwnedGamesResult> {
    if (!/^\d{17}$/.test(steamId)) {
      throw new AppError("STEAM_INVALID_ID", "Steam ID must be a 17-digit number", 400);
    }

    // Local/dev fallback: keep sync flow testable without external Steam API key.
    if (!this.apiKey) {
      return {
        total: this.fixtureGames.length,
        games: this.fixtureGames,
      };
    }

    const url = new URL("/IPlayerService/GetOwnedGames/v1/", this.baseUrl);
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("steamid", steamId);
    url.searchParams.set("include_appinfo", "true");
    url.searchParams.set("include_played_free_games", "true");
    url.searchParams.set("format", "json");

    const response = await this.fetchFn(url.toString());

    if (!response.ok) {
      throw new AppError("STEAM_API_ERROR", `Steam API request failed with status ${response.status}`, 502);
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
        iconUrl: game.img_icon_url ?? null,
      })),
    };
  }
}
