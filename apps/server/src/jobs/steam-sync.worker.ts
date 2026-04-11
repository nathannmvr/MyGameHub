// src/jobs/steam-sync.worker.ts
// Steam sync worker service and BullMQ worker registration.

import { Worker } from "bullmq";
import type { PrismaClient, GameStatus } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";
import { getRedisConfig } from "../config/redis.js";
import { RawgService } from "../services/rawg.service.js";
import { SteamService, type SteamOwnedGame } from "../services/steam.service.js";
import { STEAM_SYNC_QUEUE_NAME, type SteamSyncJobData } from "./steam-sync.job.js";
import { AppError } from "../middleware/error-handler.js";

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

interface SteamServiceLike {
  getOwnedGames(steamId: string): Promise<{ total: number; games: SteamOwnedGame[] }>;
}

function buildSteamCoverUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`;
}

function resolveSteamCoverUrl(steamGame: SteamOwnedGame): string {
  return buildSteamCoverUrl(steamGame.appId);
}

export function categorizeByPlaytime(playtimeMinutes: number): GameStatus {
  return categorizeSteamStatus(playtimeMinutes, null);
}

export function categorizeSteamStatus(
  playtimeMinutes: number,
  lastPlayedAt: Date | null,
  now = new Date()
): GameStatus {
  if (lastPlayedAt) {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 3);

    if (lastPlayedAt >= cutoff) {
      return "PLAYING";
    }

    return playtimeMinutes >= 240 ? "PLAYED" : "DROPPED";
  }

  if (playtimeMinutes === 0) {
    return "BACKLOG";
  }

  if (playtimeMinutes > 0 && playtimeMinutes < 180) {
    return "PLAYING";
  }

  return "PLAYED";
}

export class SteamSyncWorkerService {
  private readonly prisma: PrismaClient;
  private readonly steamService: SteamServiceLike;
  private readonly rawgService: RawgSearchLike;
  private readonly maxItems: number | null;

  constructor(options?: {
    prisma?: PrismaClient;
    steamService?: SteamServiceLike;
    rawgService?: RawgSearchLike;
    maxItems?: number | null;
  }) {
    this.prisma = options?.prisma ?? getPrismaClient();
    this.steamService = options?.steamService ?? new SteamService();
    this.rawgService =
      options?.rawgService ??
      (process.env.RAWG_API_KEY
        ? new RawgService()
        : {
            searchGames: async () => ({ items: [] }),
          });
      const configuredLimit = options?.maxItems ?? Number(process.env.STEAM_SYNC_MAX_ITEMS ?? "");
      this.maxItems = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : null;
  }

  async processSyncJob(data: SteamSyncJobData): Promise<void> {
    try {
      await this.prisma.syncJob.update({
        where: { id: data.syncJobId },
        data: { status: "RUNNING", errorMessage: null },
      });

      const platform = await this.prisma.platform.findFirst({
        where: {
          id: data.platformId,
          userId: data.userId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!platform) {
        throw new AppError(
          "PLATFORM_NOT_ACTIVE",
          "Selected platform was not found or is inactive for this user",
          409
        );
      }

      const owned = await this.steamService.getOwnedGames(data.steamId);

      await this.prisma.syncJob.update({
        where: { id: data.syncJobId },
        data: {
          totalItems: owned.total,
          processedItems: 0,
        },
      });

      const gamesToProcess = this.maxItems ? owned.games.slice(0, this.maxItems) : owned.games;
      let importedCount = 0;
      let alreadyInLibraryCount = 0;

      await this.prisma.syncJob.update({
        where: { id: data.syncJobId },
        data: {
          totalItems: gamesToProcess.length,
        },
      });

      for (const steamGame of gamesToProcess) {
        try {
          const game = await this.findOrCreateGame(steamGame);

          const existing = await this.prisma.userGame.findUnique({
            where: {
              userId_gameId: {
                userId: data.userId,
                gameId: game.id,
              },
            },
          });

          if (!existing) {
            await this.prisma.userGame.create({
              data: {
                userId: data.userId,
                gameId: game.id,
                platformId: data.platformId,
                status: categorizeSteamStatus(steamGame.playtimeForever, steamGame.lastPlayedAt),
                playtimeHours: steamGame.playtimeForever / 60,
              },
            });
            importedCount += 1;
          } else {
            await this.prisma.userGame.update({
              where: { id: existing.id },
              data: {
                status: categorizeSteamStatus(steamGame.playtimeForever, steamGame.lastPlayedAt),
                playtimeHours: steamGame.playtimeForever / 60,
              },
            });
            alreadyInLibraryCount += 1;
          }
        } catch {
          // Partial game failure should not fail the full sync.
        } finally {
          await this.prisma.syncJob.update({
            where: { id: data.syncJobId },
            data: {
              processedItems: {
                increment: 1,
              },
            },
          });
        }
      }

      if (
        gamesToProcess.length > 0 &&
        importedCount === 0 &&
        alreadyInLibraryCount === 0
      ) {
        throw new AppError(
          "STEAM_SYNC_NO_GAMES_IMPORTED",
          "Steam sync finished but no game could be imported. Check RAWG/Steam availability and selected platform.",
          502
        );
      }

      await this.prisma.syncJob.update({
        where: { id: data.syncJobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown worker error";

      await this.prisma.syncJob.update({
        where: { id: data.syncJobId },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private async findOrCreateGame(steamGame: SteamOwnedGame) {
    const existing = await this.prisma.game.findUnique({
      where: { steamAppId: steamGame.appId },
    });

    if (existing) {
      if (!existing.coverUrl) {
        return this.prisma.game.update({
          where: { id: existing.id },
          data: {
            coverUrl: resolveSteamCoverUrl(steamGame),
          },
        });
      }

      return existing;
    }

    let first:
      | {
          rawgId: number;
          slug: string;
          title: string;
          coverUrl: string | null;
          releaseDate: string | null;
          genres: string[];
          platforms: string[];
          metacritic: number | null;
        }
      | undefined;

    try {
      const rawg = await this.rawgService.searchGames(steamGame.name, 1, 1);
      first = rawg.items[0];
    } catch {
      // RAWG is optional for Steam sync enrichment; fallback to Steam metadata.
    }

    if (first?.rawgId) {
      const existingByRawg = await this.prisma.game.findUnique({
        where: { rawgId: first.rawgId },
      });

      if (existingByRawg) {
        return this.prisma.game.update({
          where: { id: existingByRawg.id },
          data: {
            steamAppId: existingByRawg.steamAppId ?? steamGame.appId,
            coverUrl:
              existingByRawg.coverUrl ??
              first.coverUrl ??
              resolveSteamCoverUrl(steamGame),
          },
        });
      }
    }

    return this.prisma.game.create({
      data: {
        steamAppId: steamGame.appId,
        title: first?.title ?? steamGame.name,
        rawgId: first?.rawgId ?? null,
        rawgSlug: first?.slug ?? null,
        coverUrl: first?.coverUrl ?? resolveSteamCoverUrl(steamGame),
        releaseDate: first?.releaseDate ? new Date(first.releaseDate) : null,
        genres: first?.genres ?? [],
        platforms: first?.platforms ?? [],
        metacritic: first?.metacritic ?? null,
      },
    });
  }
}

let steamSyncWorker: Worker<SteamSyncJobData> | null = null;

export function startSteamSyncWorker(): Worker<SteamSyncJobData> {
  if (steamSyncWorker) {
    return steamSyncWorker;
  }

  const redis = getRedisConfig();
  const service = new SteamSyncWorkerService();

  steamSyncWorker = new Worker<SteamSyncJobData>(
    STEAM_SYNC_QUEUE_NAME,
    async (job) => {
      await service.processSyncJob(job.data);
    },
    {
      connection: {
        host: redis.host,
        port: redis.port,
      },
    }
  );

  return steamSyncWorker;
}

export async function stopSteamSyncWorker(): Promise<void> {
  if (steamSyncWorker) {
    await steamSyncWorker.close();
    steamSyncWorker = null;
  }
}
