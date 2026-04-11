// apps/server/src/services/candidate-retriever.ts
// Multi-source candidate generation for Fase 16 re-ranking
// Ref: design.md §6.3, spec.md RN-14

import type { PrismaClient } from "@prisma/client";
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

const PLATFORM_ALIASES: Record<string, string[]> = {
  pc: ["pc"],
  "playstation 5": ["playstation 5", "ps5"],
  "playstation 4": ["playstation 4", "ps4"],
  "xbox one": ["xbox one"],
  "xbox series s/x": ["xbox series s/x", "xbox series x", "xbox series s"],
  "nintendo switch": ["nintendo switch", "switch"],
  macos: ["macos", "apple macintosh"],
  linux: ["linux"],
  ios: ["ios"],
  android: ["android"],
};

function normalizePlatformName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9/\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

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

interface GameForRetrieval {
  rawgId: number;
  title: string;
  genres: string[];
  platforms: string[];
  releaseDate: Date | null;
  metacritic: number | null;
}

/**
 * Candidate Retriever: Multi-stage generation of game candidates
 *
 * This is STAGE 1 of two-stage architecture:
 * - Stage 1 (Retrieval): Generate 300-500 candidates from 4 sources
 * - Stage 2 (Ranking): Use MultiObjectiveScorer to re-rank top-20
 *
 * Sources:
 * 1. Affinity: Games matching user's favorite genres (v1 logic)
 * 2. Item-Item: Games similar to what user plays
 * 3. Trending: Top-rated games per platform
 * 4. New Releases: Recent games matching filters
 */
export class CandidateRetriever {
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

  private async getLibraryRawgIds(userId: string): Promise<Set<number>> {
    const rawgIds = await this.prisma.userGame.findMany({
      where: { userId },
      select: {
        game: {
          select: { rawgId: true },
        },
      },
    });

    return new Set(
      rawgIds
        .map((item) => item.game.rawgId)
        .filter((id): id is number => id !== null)
    );
  }

  private isPlatformMatch(candidatePlatforms: string[], userPlatforms: string[]): boolean {
    if (userPlatforms.length === 0) {
      return true;
    }

    const normalizedUser = new Set(userPlatforms.map((platform) => normalizePlatformName(platform)));
    const normalizedCandidate = candidatePlatforms.map((platform) => normalizePlatformName(platform));

    return normalizedCandidate.some((platform) => normalizedUser.has(platform));
  }

  private mapLocalGameToCandidate(game: {
    rawgId: number | null;
    title: string;
    genres: string[];
    platforms: string[];
    releaseDate: Date | null;
    metacritic: number | null;
  }): GameForRetrieval | null {
    if (game.rawgId === null) {
      return null;
    }

    return {
      rawgId: game.rawgId,
      title: game.title,
      genres: game.genres.map(normalizePreference),
      platforms: game.platforms,
      releaseDate: game.releaseDate,
      metacritic: game.metacritic,
    };
  }

  private filterCandidates(
    candidates: GameForRetrieval[],
    inLibraryIds: Set<number>,
    userPlatforms: string[]
  ): GameForRetrieval[] {
    return candidates.filter((candidate) => {
      if (inLibraryIds.has(candidate.rawgId)) {
        return false;
      }

      return this.isPlatformMatch(candidate.platforms, userPlatforms);
    });
  }

  /**
   * Source 1: Affinity-based candidates
   * Use user's genre preferences to find matching games
   */
  async affinityBasedCandidates(
    userId: string,
    userGenres: string[],
    userPlatforms: string[],
    limit: number = 100
  ): Promise<GameForRetrieval[]> {
    if (userGenres.length === 0) {
      return [];
    }

    const inLibraryIds = await this.getLibraryRawgIds(userId);
    const query = userGenres.slice(0, 6).map(normalizePreference).join(" ");
    const pageSize = 40;
    const totalPages = Math.max(1, Math.ceil(limit / pageSize));

    const source: GameForRetrieval[] = [];
    for (let page = 1; page <= totalPages; page++) {
      const response = await this.rawgService.searchGames(query, page, pageSize);

      source.push(
        ...response.items.map((item) => ({
          rawgId: item.rawgId,
          title: item.title,
          genres: item.genres.map(normalizePreference),
          platforms: item.platforms,
          releaseDate: item.releaseDate ? new Date(item.releaseDate) : null,
          metacritic: item.metacritic,
        }))
      );

      if (response.items.length < pageSize) {
        break;
      }
    }

    return this.filterCandidates(source, inLibraryIds, userPlatforms).slice(0, limit);
  }

  /**
   * Source 2: Item-Item similarity
   * Find games similar to what user already plays
   */
  async itemItemSimilarity(
    userId: string,
    userPlatforms: string[],
    limit: number = 100
  ): Promise<GameForRetrieval[]> {
    const inLibraryIds = await this.getLibraryRawgIds(userId);

    const seeds = await this.prisma.userGame.findMany({
      where: {
        userId,
        status: { in: ["PLAYING", "PLAYED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        game: {
          select: {
            genres: true,
          },
        },
      },
    });

    if (seeds.length === 0) {
      return [];
    }

    const seedGenreSets = seeds.map((seed) => new Set(seed.game.genres.map(normalizePreference)));
    const localGames = await this.prisma.game.findMany({
      where: {
        rawgId: { not: null },
      },
      select: {
        rawgId: true,
        title: true,
        genres: true,
        platforms: true,
        releaseDate: true,
        metacritic: true,
      },
      take: 1000,
    });

    const scored = localGames
      .map((game) => {
        const mapped = this.mapLocalGameToCandidate(game);
        if (!mapped) {
          return null;
        }

        const genreSet = new Set(mapped.genres);
        if (genreSet.size === 0) {
          return null;
        }

        let bestJaccard = 0;
        for (const seedSet of seedGenreSets) {
          const intersection = [...genreSet].filter((genre) => seedSet.has(genre)).length;
          const union = new Set([...genreSet, ...seedSet]).size;
          const jaccard = union > 0 ? intersection / union : 0;
          if (jaccard > bestJaccard) {
            bestJaccard = jaccard;
          }
        }

        if (bestJaccard <= 0) {
          return null;
        }

        return {
          candidate: mapped,
          similarity: bestJaccard,
        };
      })
      .filter((entry): entry is { candidate: GameForRetrieval; similarity: number } => entry !== null)
      .sort((a, b) => {
        if (b.similarity !== a.similarity) {
          return b.similarity - a.similarity;
        }

        return (b.candidate.metacritic ?? 0) - (a.candidate.metacritic ?? 0);
      })
      .map((entry) => entry.candidate);

    return this.filterCandidates(scored, inLibraryIds, userPlatforms).slice(0, limit);
  }

  /**
   * Source 3: Trending per platform
   * Top-rated games on user's platforms (last 30 days)
   */
  async trendingByPlatform(
    userPlatforms: string[],
    limit: number = 100
  ): Promise<GameForRetrieval[]> {
    const freshnessCutoff = new Date();
    freshnessCutoff.setFullYear(freshnessCutoff.getFullYear() - 2);

    const localGames = await this.prisma.game.findMany({
      where: {
        rawgId: { not: null },
        releaseDate: { gte: freshnessCutoff },
      },
      select: {
        rawgId: true,
        title: true,
        genres: true,
        platforms: true,
        releaseDate: true,
        metacritic: true,
      },
      orderBy: [{ metacritic: "desc" }, { releaseDate: "desc" }],
      take: 600,
    });

    return localGames
      .map((game) => this.mapLocalGameToCandidate(game))
      .filter((game): game is GameForRetrieval => game !== null)
      .filter((candidate) => this.isPlatformMatch(candidate.platforms, userPlatforms))
      .slice(0, limit);
  }

  /**
   * Source 4: New releases matching profile
   * Recent games within last 90 days
   */
  async newReleaseMatch(
    userGenres: string[],
    userPlatforms: string[],
    limit: number = 100
  ): Promise<GameForRetrieval[]> {
    const releaseCutoff = new Date();
    releaseCutoff.setDate(releaseCutoff.getDate() - 90);
    const normalizedGenres = new Set(userGenres.map(normalizePreference));

    const localGames = await this.prisma.game.findMany({
      where: {
        rawgId: { not: null },
        releaseDate: { gte: releaseCutoff },
      },
      select: {
        rawgId: true,
        title: true,
        genres: true,
        platforms: true,
        releaseDate: true,
        metacritic: true,
      },
      orderBy: [{ releaseDate: "desc" }, { metacritic: "desc" }],
      take: 500,
    });

    return localGames
      .map((game) => this.mapLocalGameToCandidate(game))
      .filter((game): game is GameForRetrieval => game !== null)
      .filter((candidate) => this.isPlatformMatch(candidate.platforms, userPlatforms))
      .filter((candidate) => {
        if (normalizedGenres.size === 0) {
          return true;
        }

        return candidate.genres.some((genre) => normalizedGenres.has(normalizePreference(genre)));
      })
      .slice(0, limit);
  }

  /**
   * Deduplication and union of all 4 sources
   * Returns 300-500 unique candidates
   */
  async getAllCandidates(
    userId: string,
    userGenres: string[],
    userPlatforms: string[]
  ): Promise<GameForRetrieval[]> {
    const cacheKey = `recommendation:candidates:v1:${userId}:${userGenres.join(",")}:${userPlatforms.join(",")}`;
    const cached = await this.cache.get<GameForRetrieval[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const [affinity, similarity, trending, newRelease] = await Promise.all([
      this.affinityBasedCandidates(userId, userGenres, userPlatforms, 120),
      this.itemItemSimilarity(userId, userPlatforms, 120),
      this.trendingByPlatform(userPlatforms, 120),
      this.newReleaseMatch(userGenres, userPlatforms, 120),
    ]);

    const aggregate = new Map<
      number,
      {
        candidate: GameForRetrieval;
        totalRankScore: number;
        hits: number;
      }
    >();

    const sources = [affinity, similarity, trending, newRelease];
    for (const source of sources) {
      const sourceSize = Math.max(source.length, 1);
      source.forEach((candidate, index) => {
        const rankScore = (sourceSize - index) / sourceSize;
        const current = aggregate.get(candidate.rawgId);

        if (!current) {
          aggregate.set(candidate.rawgId, {
            candidate,
            totalRankScore: rankScore,
            hits: 1,
          });
          return;
        }

        current.totalRankScore += rankScore;
        current.hits += 1;
      });
    }

    const merged = [...aggregate.values()]
      .sort((a, b) => {
        if (b.hits !== a.hits) {
          return b.hits - a.hits;
        }

        const avgA = a.totalRankScore / a.hits;
        const avgB = b.totalRankScore / b.hits;
        if (avgB !== avgA) {
          return avgB - avgA;
        }

        return (b.candidate.metacritic ?? 0) - (a.candidate.metacritic ?? 0);
      })
      .map((entry) => entry.candidate)
      .slice(0, 500);

    await this.cache.set(cacheKey, merged, 60 * 60);
    return merged;
  }
}
