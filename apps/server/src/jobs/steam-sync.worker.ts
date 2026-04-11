// src/jobs/steam-sync.worker.ts
// Steam sync worker service and BullMQ worker registration.

import { Worker } from "bullmq";
import type { PrismaClient, GameStatus } from "@prisma/client";
import { getPrismaClient } from "../config/database.js";
import { getRedisConfig } from "../config/redis.js";
import { RawgService } from "../services/rawg.service.js";
import { SteamService, type SteamOwnedGame } from "../services/steam.service.js";
import { STEAM_SYNC_QUEUE_NAME, type SteamSyncJobData } from "./steam-sync.job.js";

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

export function categorizeByPlaytime(playtimeMinutes: number): GameStatus {
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

  constructor(options?: {
    prisma?: PrismaClient;
    steamService?: SteamServiceLike;
    rawgService?: RawgSearchLike;
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
  }

  async processSyncJob(data: SteamSyncJobData): Promise<void> {
    try {
      await this.prisma.syncJob.update({
        where: { id: data.syncJobId },
        data: { status: "RUNNING", errorMessage: null },
      });

      const owned = await this.steamService.getOwnedGames(data.steamId);

      await this.prisma.syncJob.update({
        where: { id: data.syncJobId },
        data: {
          totalItems: owned.total,
          processedItems: 0,
        },
      });

      for (const steamGame of owned.games) {
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
                status: categorizeByPlaytime(steamGame.playtimeForever),
                playtimeHours: steamGame.playtimeForever / 60,
              },
            });
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
      return existing;
    }

    const rawg = await this.rawgService.searchGames(steamGame.name, 1, 1);
    const first = rawg.items[0];

    return this.prisma.game.create({
      data: {
        steamAppId: steamGame.appId,
        title: first?.title ?? steamGame.name,
        rawgId: first?.rawgId ?? null,
        rawgSlug: first?.slug ?? null,
        coverUrl: first?.coverUrl ?? null,
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
