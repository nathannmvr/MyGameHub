// src/services/recommendation.service.ts
// Recommendation engine with exclusion and strict platform filtering.

import type { PrismaClient } from "@prisma/client";
import type {
  GameSearchResult,
  RecommendationFeedbackDTO,
  RecommendationProfile,
} from "@gamehub/shared";
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
  profile: RecommendationProfile;
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

// Popular genres are useful but weak signals. Deboost them to avoid generic recommendations.
const GENERIC_GENRE_MULTIPLIER: Record<string, number> = {
  action: 0.45,
  adventure: 0.55,
  indie: 0.6,
  shooter: 0.7,
  fighting: 0.75,
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

function normalizePreference(value: string): string {
  return value.trim().toLowerCase();
}

function addWeightedValues(counter: Map<string, number>, values: string[], weight: number): void {
  for (const value of values) {
    const normalized = normalizePreference(value);
    if (!normalized) {
      continue;
    }

    counter.set(normalized, (counter.get(normalized) ?? 0) + weight);
  }
}

function getTopWeightedValues(counter: Map<string, number>, maxItems = 5): string[] {
  return [...counter.entries()]
    .sort((a, b) => {
      const adjustedA = a[1] * (GENERIC_GENRE_MULTIPLIER[a[0]] ?? 1);
      const adjustedB = b[1] * (GENERIC_GENRE_MULTIPLIER[b[0]] ?? 1);
      return adjustedB - adjustedA;
    })
    .slice(0, maxItems)
    .map(([value]) => value);
}

function getProfileWeight(item: {
  status: "WISHLIST" | "BACKLOG" | "PLAYING" | "PLAYED" | "DROPPED";
  rating: number | null;
  updatedAt: Date;
}, now = new Date()): number {
  let weight = 0;

  switch (item.status) {
    case "PLAYING":
      weight += 6;
      break;
    case "PLAYED":
      weight += 3;
      break;
    case "WISHLIST":
      weight += 1.5;
      break;
    default:
      break;
  }

  if (item.rating !== null) {
    // Stronger weighting for high-rated games (10 has considerably more weight than 7).
    weight += Math.max(item.rating - 6, 0) * 1.2;
  }

  const recentCutoff = new Date(now);
  recentCutoff.setMonth(recentCutoff.getMonth() - 3);

  if (item.updatedAt >= recentCutoff) {
    weight += 2;
  }

  return weight;
}

function getPenaltyWeight(item: {
  status: "WISHLIST" | "BACKLOG" | "PLAYING" | "PLAYED" | "DROPPED";
  rating: number | null;
  updatedAt: Date;
}, now = new Date()): number {
  let penalty = 0;

  if (item.status === "DROPPED") {
    penalty += 7;
  }

  if (item.rating !== null) {
    if (item.rating <= 3) {
      penalty += 5;
    } else if (item.rating <= 5) {
      penalty += 3;
    } else if (item.rating <= 6) {
      penalty += 1.5;
    }
  }

  const recentCutoff = new Date(now);
  recentCutoff.setMonth(recentCutoff.getMonth() - 3);

  if (penalty > 0 && item.updatedAt >= recentCutoff) {
    penalty += 1;
  }

  return penalty;
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
    this.rawgService =
      options?.rawgService ??
      (process.env.RAWG_API_KEY
        ? new RawgService()
        : {
            searchGames: async () => ({ items: [] }),
          });
    this.cache = options?.cache ?? new CacheService({ defaultTtlSeconds: 3600 });
  }

  async getRecommendations(userId: string, query: RecommendationQuery): Promise<RecommendationResult> {
    const cacheKey = `rawg:discover:v3:${userId}:${query.profile}:${query.page}:${query.pageSize}`;
    const cached = await this.cache.get<RecommendationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const sample = await this.prisma.userGame.findMany({
      where: {
        userId,
        status: { in: ["PLAYING", "PLAYED", "WISHLIST", "DROPPED"] },
      },
      select: {
        status: true,
        rating: true,
        updatedAt: true,
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

    const genreWeights = new Map<string, number>();
    const tagWeights = new Map<string, number>();
    const dislikedGenreWeights = new Map<string, number>();
    const dislikedTagWeights = new Map<string, number>();

    const feedback = await this.prisma.userRecommendationFeedback.findMany({
      where: { userId },
      select: {
        rawgId: true,
        genres: true,
        tags: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    for (const item of sample) {
      const weight = getProfileWeight(item);

      if (weight > 0) {
        addWeightedValues(genreWeights, item.game.genres, weight);
        addWeightedValues(tagWeights, item.game.tags, weight * 0.7);
      }

      const penaltyWeight = getPenaltyWeight(item);
      if (penaltyWeight > 0) {
        addWeightedValues(dislikedGenreWeights, item.game.genres, penaltyWeight);
        addWeightedValues(dislikedTagWeights, item.game.tags, penaltyWeight * 0.8);
      }
    }

    for (const item of feedback) {
      addWeightedValues(dislikedGenreWeights, item.genres, 4);
      addWeightedValues(dislikedTagWeights, item.tags, 2.5);
    }

    const topGenres = getTopWeightedValues(genreWeights, 6);
    const topTags = getTopWeightedValues(tagWeights, 4);

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

    let candidates: Array<{
      rawgId: number;
      slug: string;
      title: string;
      coverUrl: string | null;
      releaseDate: string | null;
      genres: string[];
      platforms: string[];
      metacritic: number | null;
    }> = [];

    try {
      const rawg = await this.rawgService.searchGames(searchQuery, 1, 40);
      candidates = rawg.items;
    } catch {
      // Local fallback when external RAWG dependency is unavailable.
      const localGames = await this.prisma.game.findMany({
        where: {
          rawgId: { not: null },
        },
        take: 80,
        orderBy: { metacritic: "desc" },
      });

      candidates = localGames
        .filter((game) => game.rawgId !== null)
        .map((game) => ({
          rawgId: game.rawgId as number,
          slug: game.rawgSlug ?? `game-${game.rawgId}`,
          title: game.title,
          coverUrl: game.coverUrl,
          releaseDate: game.releaseDate ? game.releaseDate.toISOString().slice(0, 10) : null,
          genres: game.genres,
          platforms: game.platforms,
          metacritic: game.metacritic,
        }));
    }

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

      const dismissedIds = new Set(feedback.map((item) => item.rawgId));

    const activePlatforms = await this.prisma.platform.findMany({
      where: { userId, isActive: true },
      select: { name: true },
    });

    const normalizedUserPlatforms = new Set(
      activePlatforms.map((platform) => normalizePlatformName(platform.name))
    );

    const filtered = candidates.filter((candidate) => {
      if (inLibraryIds.has(candidate.rawgId)) {
        return false;
      }

      if (dismissedIds.has(candidate.rawgId)) {
        return false;
      }

      const normalizedCandidatePlatforms = candidate.platforms.map((p) => normalizePlatformName(p));
      return normalizedCandidatePlatforms.some((platform) => normalizedUserPlatforms.has(platform));
    });

    const minSharedGenres = 1;
    const minFinalScore = query.profile === "exploratory" ? 0.4 : 1;
    const minOverlapRatio = query.profile === "exploratory" ? 0.3 : 0.6;

    const scored = filtered
      .map((candidate) => {
        const normalizedGenres = candidate.genres.map((genre) => normalizePreference(genre));
        const overlappedWeights = normalizedGenres
          .map((genre) => genreWeights.get(genre) ?? 0)
          .filter((value) => value > 0);

        // Hard relevance gate: recommendations must overlap with user preference genres.
        if (overlappedWeights.length < minSharedGenres) {
          return null;
        }

        const overlapTotal = overlappedWeights.reduce((sum, value) => sum + value, 0);
        const specificityScore = overlapTotal / Math.max(normalizedGenres.length, 1);
        const overlapRatio = overlappedWeights.length / Math.max(normalizedGenres.length, 1);
        const dislikedGenrePenalty = normalizedGenres.reduce((total, genre) => {
          return total + (dislikedGenreWeights.get(genre) ?? 0);
        }, 0);
        const hasStrongDislikedGenre = normalizedGenres.some(
          (genre) => (dislikedGenreWeights.get(genre) ?? 0) >= 8
        );

        if (overlapRatio < minOverlapRatio) {
          return null;
        }

        if (query.profile === "conservative" && hasStrongDislikedGenre) {
          return null;
        }

        // Metacritic acts only as a tie-breaker, never as the main ranking signal.
        const metacriticBonus = candidate.metacritic ? candidate.metacritic / 1000 : 0;
        const score = overlapTotal + specificityScore * 2 + metacriticBonus - dislikedGenrePenalty * 1.25;

        if (score < minFinalScore) {
          return null;
        }

        return {
          candidate,
          score,
        };
      })
      .filter((entry): entry is { candidate: (typeof candidates)[number]; score: number } => entry !== null)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.candidate);

    const start = (query.page - 1) * query.pageSize;
    const paged = scored.slice(start, start + query.pageSize);

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
        totalItems: scored.length,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(scored.length / query.pageSize),
      },
    };

    await this.cache.set(cacheKey, result, 60 * 60);
    return result;
  }

  async submitFeedback(userId: string, payload: RecommendationFeedbackDTO): Promise<void> {
    await this.prisma.userRecommendationFeedback.upsert({
      where: {
        userId_rawgId: {
          userId,
          rawgId: payload.rawgId,
        },
      },
      create: {
        userId,
        rawgId: payload.rawgId,
        title: payload.title,
        genres: payload.genres ?? [],
        tags: payload.tags ?? [],
        reason: payload.reason,
      },
      update: {
        title: payload.title,
        genres: payload.genres ?? [],
        tags: payload.tags ?? [],
        reason: payload.reason,
      },
    });

    await this.cache.flush(`rawg:discover:v3:${userId}:*`);
  }
}
