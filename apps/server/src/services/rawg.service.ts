// src/services/rawg.service.ts
// RAWG API client with cache, throttle and retry strategy.

import { AppError } from "../middleware/error-handler.js";
import { CacheService } from "./cache.service.js";

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;
type SleepFn = (ms: number) => Promise<void>;
type NowFn = () => number;

const sleep: SleepFn = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export interface RawgSearchItem {
  rawgId: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  releaseDate: string | null;
  genres: string[];
  platforms: string[];
  metacritic: number | null;
}

export interface RawgSearchResponse {
  items: RawgSearchItem[];
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface RawgGameDetails {
  rawgId: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  backgroundUrl: string | null;
  releaseDate: string | null;
  description: string | null;
  metacritic: number | null;
  developer: string | null;
  publisher: string | null;
  genres: string[];
  tags: string[];
  platforms: string[];
}

interface RawgListResponse {
  count: number;
  results: Array<{
    id: number;
    slug: string;
    name: string;
    background_image: string | null;
    released: string | null;
    genres: Array<{ name: string }>;
    platforms: Array<{ platform: { name: string } }>;
    metacritic: number | null;
  }>;
}

interface RawgDetailResponse {
  id: number;
  slug: string;
  name: string;
  background_image: string | null;
  background_image_additional: string | null;
  released: string | null;
  description_raw: string | null;
  metacritic: number | null;
  developers: Array<{ name: string }>;
  publishers: Array<{ name: string }>;
  genres: Array<{ name: string }>;
  tags: Array<{ name: string }>;
  platforms: Array<{ platform: { name: string } }>;
}

export interface RawgServiceOptions {
  apiKey?: string;
  cache?: CacheService;
  fetchFn?: FetchFn;
  sleepFn?: SleepFn;
  nowFn?: NowFn;
  baseUrl?: string;
  requestDelayMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  cacheTtlSearchSeconds?: number;
  cacheTtlDetailSeconds?: number;
}

export class RawgService {
  private readonly apiKey: string;
  private readonly cache: CacheService;
  private readonly fetchFn: FetchFn;
  private readonly sleepFn: SleepFn;
  private readonly nowFn: NowFn;
  private readonly baseUrl: string;
  private readonly requestDelayMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly cacheTtlSearchSeconds: number;
  private readonly cacheTtlDetailSeconds: number;
  private lastRequestTime = 0;

  constructor(options: RawgServiceOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.RAWG_API_KEY ?? "";
    this.cache = options.cache ?? new CacheService();
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleepFn = options.sleepFn ?? sleep;
    this.nowFn = options.nowFn ?? Date.now;
    this.baseUrl = options.baseUrl ?? "https://api.rawg.io/api";
    this.requestDelayMs = options.requestDelayMs ?? 200;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.cacheTtlSearchSeconds = options.cacheTtlSearchSeconds ?? 15 * 60;
    this.cacheTtlDetailSeconds = options.cacheTtlDetailSeconds ?? 60 * 60;

    if (!this.apiKey) {
      throw new AppError("RAWG_API_KEY_MISSING", "RAWG API key is not configured", 500);
    }
  }

  async searchGames(query: string, page = 1, pageSize = 20): Promise<RawgSearchResponse> {
    const cacheKey = `rawg:search:${query}:${page}:${pageSize}`;
    const cached = await this.cache.get<RawgSearchResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const payload = await this.requestWithRetry<RawgListResponse>("/games", {
      search: query,
      page: String(page),
      page_size: String(pageSize),
    });

    const mapped: RawgSearchResponse = {
      items: payload.results.map((game) => ({
        rawgId: game.id,
        slug: game.slug,
        title: game.name,
        coverUrl: game.background_image,
        releaseDate: game.released,
        genres: game.genres.map((g) => g.name),
        platforms: game.platforms.map((p) => p.platform.name),
        metacritic: game.metacritic,
      })),
      pagination: {
        totalItems: payload.count,
        page,
        pageSize,
        totalPages: Math.ceil(payload.count / pageSize),
      },
    };

    await this.cache.set(cacheKey, mapped, this.cacheTtlSearchSeconds);
    return mapped;
  }

  async getGameDetails(rawgId: number): Promise<RawgGameDetails> {
    const cacheKey = `rawg:detail:${rawgId}`;
    const cached = await this.cache.get<RawgGameDetails>(cacheKey);
    if (cached) {
      return cached;
    }

    const payload = await this.requestWithRetry<RawgDetailResponse>(`/games/${rawgId}`);

    const mapped: RawgGameDetails = {
      rawgId: payload.id,
      slug: payload.slug,
      title: payload.name,
      coverUrl: payload.background_image,
      backgroundUrl: payload.background_image_additional,
      releaseDate: payload.released,
      description: payload.description_raw,
      metacritic: payload.metacritic,
      developer: payload.developers[0]?.name ?? null,
      publisher: payload.publishers[0]?.name ?? null,
      genres: payload.genres.map((g) => g.name),
      tags: payload.tags.map((t) => t.name),
      platforms: payload.platforms.map((p) => p.platform.name),
    };

    await this.cache.set(cacheKey, mapped, this.cacheTtlDetailSeconds);
    return mapped;
  }

  private async throttle(): Promise<void> {
    const now = this.nowFn();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.requestDelayMs) {
      await this.sleepFn(this.requestDelayMs - elapsed);
    }

    this.lastRequestTime = this.nowFn();
  }

  private async requestWithRetry<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      await this.throttle();

      const url = this.buildUrl(path, params);
      const response = await this.fetchFn(url);

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 429 && attempt < this.maxRetries) {
        const backoffMs = this.retryDelayMs * (attempt + 1);
        await this.sleepFn(backoffMs);
        attempt += 1;
        continue;
      }

      if (response.status === 404) {
        throw new AppError("GAME_NOT_FOUND", "Game not found in RAWG", 404);
      }

      throw new AppError("RAWG_API_ERROR", `RAWG request failed with status ${response.status}`, 502);
    }

    throw new AppError("RAWG_RETRY_EXCEEDED", "RAWG retry attempts exceeded", 502);
  }

  private buildUrl(path: string, params: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    url.searchParams.set("key", this.apiKey);
    return url.toString();
  }
}
