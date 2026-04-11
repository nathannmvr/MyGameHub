// src/services/recommendation.service.ts
// Recommendation engine with exclusion and strict platform filtering.

import type { PrismaClient } from "@prisma/client";
import type {
  GameSearchResult,
  RecommendationFeedbackDTO,
  RecommendationProfile,
} from "@gamehub/shared";
import { RecommendationEventType, RecommendationReason } from "@gamehub/shared";
import { getPrismaClient } from "../config/database.js";
import { CacheService } from "./cache.service.js";
import { CandidateRetriever } from "./candidate-retriever.js";
import { MultiObjectiveScorer, type GameForScoring, type UserProfileData } from "./multi-objective-scorer.js";
import { RawgService } from "./rawg.service.js";
import { TelemetryService } from "./telemetry.service.js";

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
  experimentGroup?: "control" | "treatment";
  fallbackToTrending?: boolean;
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
  private readonly candidateRetriever: CandidateRetriever;
  private readonly scorer: MultiObjectiveScorer;
  private readonly telemetryService: TelemetryService;

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
    this.candidateRetriever = new CandidateRetriever({
      prisma: this.prisma,
      rawgService: this.rawgService,
      cache: this.cache,
    });
    this.scorer = new MultiObjectiveScorer();
    this.telemetryService = new TelemetryService(this.prisma);
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
            rawgId: true,
            genres: true,
            tags: true,
          },
        },
      },
    });

    const activePlatforms = await this.prisma.platform.findMany({
      where: { userId, isActive: true },
      select: { name: true },
    });
    const userPlatformNames = activePlatforms.map((platform) => platform.name);

    // Cold-start fallback path
    if (sample.length < 10 && query.fallbackToTrending) {
      const fallbackCandidates = await this.candidateRetriever.trendingByPlatform(userPlatformNames, 80);
      const fallbackPaged = fallbackCandidates.slice(
        (query.page - 1) * query.pageSize,
        (query.page - 1) * query.pageSize + query.pageSize
      );

      const fallbackResult: RecommendationResult = {
        data: fallbackPaged.map((item) => ({
          rawgId: item.rawgId,
          slug: item.slug,
          title: item.title,
          coverUrl: item.coverUrl,
          releaseDate: item.releaseDate ? item.releaseDate.toISOString().slice(0, 10) : null,
          genres: item.genres,
          platforms: item.platforms,
          metacritic: item.metacritic,
          alreadyInLibrary: false,
          reason: RecommendationReason.TRENDING_ON_PLATFORM,
        })),
        pagination: {
          totalItems: fallbackCandidates.length,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.ceil(fallbackCandidates.length / query.pageSize),
        },
      };

      await this.cache.set(cacheKey, fallbackResult, 60 * 60);
      return fallbackResult;
    }

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

    const genreWeights = new Map<string, number>();
    const tagWeights = new Map<string, number>();
    const dislikedGenreWeights = new Map<string, number>();

    const userGameIds: number[] = [];
    const droppedGameIds: number[] = [];
    const lowRatedGameIds: number[] = [];
    const playingGenreSet = new Set<string>();

    for (const item of sample) {
      const weight = getProfileWeight(item);
      if (weight > 0) {
        addWeightedValues(genreWeights, item.game.genres, weight);
        addWeightedValues(tagWeights, item.game.tags, weight * 0.7);
      }

      const penaltyWeight = getPenaltyWeight(item);
      if (penaltyWeight > 0) {
        addWeightedValues(dislikedGenreWeights, item.game.genres, penaltyWeight);
      }

      if (item.game.rawgId !== null) {
        userGameIds.push(item.game.rawgId);
      }
      if (item.status === "DROPPED" && item.game.rawgId !== null) {
        droppedGameIds.push(item.game.rawgId);
      }
      if (item.rating !== null && item.rating <= 5 && item.game.rawgId !== null) {
        lowRatedGameIds.push(item.game.rawgId);
      }
      if (item.status === "PLAYING") {
        for (const genre of item.game.genres) {
          playingGenreSet.add(normalizePreference(genre));
        }
      }
    }

    const topGenres = getTopWeightedValues(genreWeights, 6);
    const topTags = getTopWeightedValues(tagWeights, 4);

    const dismissedRawgIds = new Set(feedback.map((item) => item.rawgId));
    const likedGenreSet = new Set(topGenres.map(normalizePreference));
    const dislikedGenreSet = new Set([...dislikedGenreWeights.keys()].map(normalizePreference));

    const minConservativeOverlap = query.profile === "conservative" && likedGenreSet.size > 0 ? 1 : 0;

    const allCandidates = await this.candidateRetriever.getAllCandidates(userId, topGenres, userPlatformNames);
    const candidates = allCandidates.filter((candidate) => {
      if (dismissedRawgIds.has(candidate.rawgId)) {
        return false;
      }

      const normalizedGenres = candidate.genres.map(normalizePreference);
      const likedOverlap = normalizedGenres.filter((genre) => likedGenreSet.has(genre)).length;
      const dislikedOverlap = normalizedGenres.filter((genre) => dislikedGenreSet.has(genre)).length;
      const hasMixedGenres = normalizedGenres.some((genre) => !likedGenreSet.has(genre));

      if (query.profile === "conservative" && likedOverlap < minConservativeOverlap) {
        return false;
      }

      // Conservative profile blocks candidates overlapping dropped/low-rated genre signals.
      if (query.profile === "conservative" && dislikedOverlap > 0) {
        return false;
      }

      // Conservative mode avoids weak mixed-genre candidates with low quality signal.
      if (query.profile === "conservative" && likedOverlap === 1 && hasMixedGenres && (candidate.metacritic ?? 0) < 75) {
        return false;
      }

      return true;
    });

    const profileData: UserProfileData = {
      profile: query.profile,
      userGenres: topGenres,
      userTags: topTags,
      userPlatforms: userPlatformNames,
      userGameIds,
      droppedGameIds,
      lowRatedGameIds,
    };

    const forScoring: GameForScoring[] = candidates.map((candidate) => ({
      rawgId: candidate.rawgId,
      title: candidate.title,
      genres: candidate.genres,
      platforms: candidate.platforms,
      releaseDate: candidate.releaseDate,
      metacritic: candidate.metacritic,
    }));

    const ranked = this.scorer.rankGames(forScoring, profileData, 120);

    const reasonByRawgId = new Map<number, RecommendationReason>();
    const scoreByRawgId = new Map<number, ReturnType<MultiObjectiveScorer["score"]>>();

    for (const entry of ranked) {
      scoreByRawgId.set(entry.game.rawgId, entry.scoreBreakdown);

      const genres = entry.game.genres.map(normalizePreference);
      const hasPlayingAffinity = genres.some((genre) => playingGenreSet.has(genre));

      let reason = RecommendationReason.GENRE_AFFINITY;
      if (entry.scoreBreakdown.robustness >= 45) {
        reason = RecommendationReason.TRENDING_ON_PLATFORM;
      } else if (entry.scoreBreakdown.novelty >= 45) {
        reason = RecommendationReason.NEW_RELEASE_MATCH;
      } else if (hasPlayingAffinity) {
        reason = RecommendationReason.SIMILAR_TO_PLAYING;
      }

      reasonByRawgId.set(entry.game.rawgId, reason);
    }

    const rankedIds = ranked.map((item) => item.game.rawgId);
    const rankedSet = new Set(rankedIds);

    const rankedCandidates = candidates
      .filter((candidate) => rankedSet.has(candidate.rawgId))
      .sort((a, b) => rankedIds.indexOf(a.rawgId) - rankedIds.indexOf(b.rawgId));

    const start = (query.page - 1) * query.pageSize;
    const paged = rankedCandidates.slice(start, start + query.pageSize);

    const result: RecommendationResult = {
      data: paged.map((item) => ({
        rawgId: item.rawgId,
        slug: item.slug,
        title: item.title,
        coverUrl: item.coverUrl,
        releaseDate: item.releaseDate ? item.releaseDate.toISOString().slice(0, 10) : null,
        genres: item.genres,
        platforms: item.platforms,
        metacritic: item.metacritic,
        alreadyInLibrary: false,
        reason: reasonByRawgId.get(item.rawgId) ?? RecommendationReason.GENRE_AFFINITY,
        scoreBreakdown: scoreByRawgId.get(item.rawgId),
      })),
      pagination: {
        totalItems: rankedCandidates.length,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(rankedCandidates.length / query.pageSize),
      },
    };

    await this.cache.set(cacheKey, result, 60 * 60);
    return result;
  }

  async submitFeedback(userId: string, payload: RecommendationFeedbackDTO): Promise<void> {
    const inferEventType = (): RecommendationEventType => {
      if (payload.eventType) {
        return payload.eventType;
      }

      const normalizedReason = payload.reason?.toLowerCase() ?? "";
      if (normalizedReason.includes("event:impression")) return RecommendationEventType.IMPRESSION;
      if (normalizedReason.includes("event:open_details")) return RecommendationEventType.OPEN_DETAILS;
      if (normalizedReason.includes("event:add_to_library")) return RecommendationEventType.ADD_TO_LIBRARY;
      if (normalizedReason.includes("event:hide")) return RecommendationEventType.HIDE;
      return RecommendationEventType.DISMISS;
    };

    const eventType = inferEventType();

    await this.telemetryService.logEvent(userId, payload.rawgId, eventType);

    if (eventType === RecommendationEventType.DISMISS || eventType === RecommendationEventType.HIDE) {
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
      await this.cache.flush(`recommendation:candidates:v1:${userId}:*`);
    }
  }

  async getExperimentMetrics(params: {
    startDate: Date;
    endDate: Date;
    experimentGroup?: "control" | "treatment";
    k?: number;
  }) {
    return this.telemetryService.computeMetricsForExperiment(
      params.startDate,
      params.endDate,
      params.experimentGroup,
      params.k ?? 10
    );
  }
}
