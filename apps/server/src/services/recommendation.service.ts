// src/services/recommendation.service.ts
// Recommendation engine with exclusion and strict platform filtering.

import type { PrismaClient } from "@prisma/client";
import type { GameSearchResult } from "@gamehub/shared";
import { getPrismaClient } from "../config/database.js";
import { CacheService } from "./cache.service.js";
import { RawgService } from "./rawg.service.js";

interface RawgSearchLike {
  searchGames(query: string, page?: number, pageSize?: number): Promise<{
    items: Array<{
      rawgId: number;
      slug: string;
      title: string;
      coverUrl: string | null;
      releaseDate: string | null;
      genres: string[];
      platforms: string[];
      metacritic: number | null;
    }>;
  }>;
}

interface RecommendationQuery {
  page: number;
  pageSize: number;
}

interface RecommendationResult {
  data: GameSearchResult[];
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

const PLATFORM_ALIASES: Record<string, string[]> = {
  "pc": ["pc"],
  "playstation 5": ["playstation 5", "ps5"],
  "playstation 4": ["playstation 4", "ps4"],
  "xbox one": ["xbox one"],
  "xbox series s/x": ["xbox series s/x", "xbox series x", "xbox series s"],
  "nintendo switch": ["nintendo switch", "switch"],
  "macos": ["macos", "apple macintosh"],
  "linux": ["linux"],
  "ios": ["ios"],
  "android": ["android"],
};

function normalizePlatformName(name: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z0-9/\s]/g, "").replace(/\s+/g, " ").trim();

  for (const [canonical, aliases] of Object.entries(PLATFORM_ALIASES)) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

function countTopValues(values: string[], maxItems = 5): string[] {
  const counter = new Map<string, number>();

  for (const value of values) {
    counter.set(value, (counter.get(value) ?? 0) + 1);
  }

  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([value]) => value);
}

export class RecommendationService {
  private readonly prisma: PrismaClient;
  private readonly rawgService: RawgSearchLike;
  private readonly cache: CacheService;

  constructor(options?: {
    prisma?: PrismaClient;
    rawgService?: RawgSearchLike;
    cache?: CacheService;
  }) {
    this.prisma = options?.prisma ?? getPrismaClient();
    this.rawgService = options?.rawgService ?? new RawgService();
    this.cache = options?.cache ?? new CacheService({ defaultTtlSeconds: 3600 });
  }

  async getRecommendations(userId: string, query: RecommendationQuery): Promise<RecommendationResult> {
    const cacheKey = `rawg:discover:${userId}:${query.page}:${query.pageSize}`;
    const cached = await this.cache.get<RecommendationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const sample = await this.prisma.userGame.findMany({
      where: {
        userId,
        OR: [
          {
            status: "PLAYED",
            OR: [{ rating: null }, { rating: { gte: 7 } }],
          },
          { status: "WISHLIST" },
        ],
      },
      include: {
        game: {
          select: {
            genres: true,
            tags: true,
          },
        },
      },
    });

    if (sample.length === 0) {
      return {
        data: [],
        pagination: {
          totalItems: 0,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: 0,
        },
      };
    }

    const allGenres = sample.flatMap((item) => item.game.genres);
    const allTags = sample.flatMap((item) => item.game.tags);

    const topGenres = countTopValues(allGenres, 5);
    const topTags = countTopValues(allTags, 5);

    const searchQuery = [...topGenres, ...topTags].join(" ").trim();
    if (!searchQuery) {
      return {
        data: [],
        pagination: {
          totalItems: 0,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: 0,
        },
      };
    }

    const rawg = await this.rawgService.searchGames(searchQuery, 1, 40);

    const inLibraryIds = new Set(
      (
        await this.prisma.userGame.findMany({
          where: { userId },
          select: {
            game: {
              select: { rawgId: true },
            },
          },
        })
      )
        .map((item) => item.game.rawgId)
        .filter((id): id is number => id !== null)
    );

    const activePlatforms = await this.prisma.platform.findMany({
      where: { userId, isActive: true },
      select: { name: true },
    });

    const normalizedUserPlatforms = new Set(
      activePlatforms.map((platform) => normalizePlatformName(platform.name))
    );

    const filtered = rawg.items.filter((candidate) => {
      if (inLibraryIds.has(candidate.rawgId)) {
        return false;
      }

      const normalizedCandidatePlatforms = candidate.platforms.map((p) => normalizePlatformName(p));
      return normalizedCandidatePlatforms.some((platform) => normalizedUserPlatforms.has(platform));
    });

    const start = (query.page - 1) * query.pageSize;
    const paged = filtered.slice(start, start + query.pageSize);

    const result: RecommendationResult = {
      data: paged.map((item) => ({
        rawgId: item.rawgId,
        slug: item.slug,
        title: item.title,
        coverUrl: item.coverUrl,
        releaseDate: item.releaseDate,
        genres: item.genres,
        platforms: item.platforms,
        metacritic: item.metacritic,
        alreadyInLibrary: false,
      })),
      pagination: {
        totalItems: filtered.length,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(filtered.length / query.pageSize),
      },
    };

    await this.cache.set(cacheKey, result, 60 * 60);
    return result;
  }
}
