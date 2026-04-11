import { AppError } from "../middleware/error-handler.js";
import { CacheService } from "./cache.service.js";

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface IgdbSearchItem {
  igdbId: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  releaseDate: string | null;
  genres: string[];
  platforms: string[];
  metacritic: number | null;
}

export interface IgdbSearchResponse {
  items: IgdbSearchItem[];
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface IgdbTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface IgdbGameResponse {
  id: number;
  slug: string;
  name: string;
  first_release_date?: number;
  total_rating?: number;
  cover?: { image_id?: string };
  genres?: Array<{ name: string }>;
  platforms?: Array<{ name: string }>;
}

export interface IgdbServiceOptions {
  clientId?: string;
  clientSecret?: string;
  cache?: CacheService;
  fetchFn?: FetchFn;
}

export class IgdbService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly cache: CacheService;
  private readonly fetchFn: FetchFn;

  constructor(options: IgdbServiceOptions = {}) {
    this.clientId = options.clientId ?? process.env.IGDB_CLIENT_ID ?? "";
    this.clientSecret = options.clientSecret ?? process.env.IGDB_CLIENT_SECRET ?? "";
    this.cache = options.cache ?? new CacheService();
    this.fetchFn = options.fetchFn ?? fetch;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  async searchGames(query: string, page = 1, pageSize = 20): Promise<IgdbSearchResponse> {
    if (!this.isConfigured()) {
      throw new AppError("IGDB_CREDENTIALS_MISSING", "IGDB credentials are not configured", 500);
    }

    const normalized = query.trim();
    const cacheKey = `igdb:search:${normalized}:${page}:${pageSize}`;
    const cached = await this.cache.get<IgdbSearchResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const token = await this.getAccessToken();
    const offset = (page - 1) * pageSize;
    const body = [
      "fields id,slug,name,first_release_date,total_rating,cover.image_id,genres.name,platforms.name;",
      `search \"${normalized.replace(/\"/g, "")}\";`,
      "where category = (0,8,9,10,11);",
      `limit ${pageSize};`,
      `offset ${offset};`,
    ].join(" ");

    const response = await this.fetchFn("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": this.clientId,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!response.ok) {
      throw new AppError("IGDB_API_ERROR", `IGDB search failed with status ${response.status}`, 502);
    }

    const payload = (await response.json()) as IgdbGameResponse[];
    const mappedItems = payload.map((item) => ({
      igdbId: item.id,
      slug: item.slug,
      title: item.name,
      coverUrl: item.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.jpg`
        : null,
      releaseDate: item.first_release_date
        ? new Date(item.first_release_date * 1000).toISOString().slice(0, 10)
        : null,
      genres: item.genres?.map((genre) => genre.name) ?? [],
      platforms: item.platforms?.map((platform) => platform.name) ?? [],
      metacritic: item.total_rating ? Math.round(item.total_rating) : null,
    }));

    const result: IgdbSearchResponse = {
      items: mappedItems,
      pagination: {
        // IGDB search endpoint does not return total count in this mode.
        totalItems: mappedItems.length,
        page,
        pageSize,
        totalPages: mappedItems.length < pageSize ? page : page + 1,
      },
    };

    await this.cache.set(cacheKey, result, 15 * 60);
    return result;
  }

  private async getAccessToken(): Promise<string> {
    const cacheKey = "igdb:oauth:token";
    const cached = await this.cache.get<string>(cacheKey);

    if (cached) {
      return cached;
    }

    const url = new URL("https://id.twitch.tv/oauth2/token");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("client_secret", this.clientSecret);
    url.searchParams.set("grant_type", "client_credentials");

    const response = await this.fetchFn(url.toString(), {
      method: "POST",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new AppError("IGDB_AUTH_ERROR", `IGDB auth failed with status ${response.status}`, 502);
    }

    const payload = (await response.json()) as IgdbTokenResponse;
    const ttl = Math.max(payload.expires_in - 60, 60);
    await this.cache.set(cacheKey, payload.access_token, ttl);

    return payload.access_token;
  }
}
