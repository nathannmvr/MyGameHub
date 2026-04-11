// tests/unit/jobs/steam-sync.worker.test.ts
// TDD RED -> GREEN: Steam sync worker behavior.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { SteamSyncWorkerService } from "../../../src/jobs/steam-sync.worker.js";

// Load .env from apps/server
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanDatabase() {
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

describe("SteamSyncWorkerService", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it("should process owned games and update SyncJob progress", async () => {
    const user = await prisma.user.create({ data: { username: "worker_user_1" } });
    const platform = await prisma.platform.create({
      data: { userId: user.id, name: "PC", manufacturer: "Various" },
    });

    const syncJob = await prisma.syncJob.create({
      data: { userId: user.id, type: "STEAM", status: "PENDING" },
    });

    const steamService = {
      getOwnedGames: vi.fn().mockResolvedValue({
        total: 2,
        games: [
          { appId: 570, name: "Dota 2", playtimeForever: 0, iconUrl: null },
          { appId: 730, name: "Counter-Strike 2", playtimeForever: 200, iconUrl: null },
        ],
      }),
    };

    const rawgService = {
      searchGames: vi
        .fn()
        .mockResolvedValue({ items: [], pagination: { totalItems: 0, page: 1, pageSize: 1, totalPages: 0 } }),
    };

    const worker = new SteamSyncWorkerService({ prisma, steamService, rawgService });

    await worker.processSyncJob({
      syncJobId: syncJob.id,
      userId: user.id,
      steamId: "76561198000000000",
      platformId: platform.id,
    });

    const finishedJob = await prisma.syncJob.findUniqueOrThrow({ where: { id: syncJob.id } });
    const userGames = await prisma.userGame.findMany({ where: { userId: user.id } });

    expect(finishedJob.status).toBe("COMPLETED");
    expect(finishedJob.totalItems).toBe(2);
    expect(finishedJob.processedItems).toBe(2);
    expect(userGames).toHaveLength(2);
    expect(userGames.some((g) => g.status === "BACKLOG")).toBe(true);
    expect(userGames.some((g) => g.status === "PLAYED")).toBe(true);
  });

  it("should ignore game already in user library (RN-06)", async () => {
    const user = await prisma.user.create({ data: { username: "worker_user_2" } });
    const platform = await prisma.platform.create({
      data: { userId: user.id, name: "PC", manufacturer: "Various" },
    });

    const existingGame = await prisma.game.create({
      data: { steamAppId: 570, title: "Dota 2" },
    });

    await prisma.userGame.create({
      data: {
        userId: user.id,
        gameId: existingGame.id,
        platformId: platform.id,
        status: "PLAYING",
      },
    });

    const syncJob = await prisma.syncJob.create({
      data: { userId: user.id, type: "STEAM", status: "PENDING" },
    });

    const steamService = {
      getOwnedGames: vi.fn().mockResolvedValue({
        total: 1,
        games: [{ appId: 570, name: "Dota 2", playtimeForever: 500, iconUrl: null }],
      }),
    };

    const rawgService = {
      searchGames: vi.fn().mockResolvedValue({ items: [], pagination: { totalItems: 0, page: 1, pageSize: 1, totalPages: 0 } }),
    };

    const worker = new SteamSyncWorkerService({ prisma, steamService, rawgService });

    await worker.processSyncJob({
      syncJobId: syncJob.id,
      userId: user.id,
      steamId: "76561198000000000",
      platformId: platform.id,
    });

    const userGames = await prisma.userGame.findMany({ where: { userId: user.id } });
    expect(userGames).toHaveLength(1);
  });

  it("should continue processing when one game fails", async () => {
    const user = await prisma.user.create({ data: { username: "worker_user_3" } });
    const platform = await prisma.platform.create({
      data: { userId: user.id, name: "PC", manufacturer: "Various" },
    });

    const syncJob = await prisma.syncJob.create({
      data: { userId: user.id, type: "STEAM", status: "PENDING" },
    });

    const steamService = {
      getOwnedGames: vi.fn().mockResolvedValue({
        total: 2,
        games: [
          { appId: 111, name: "Broken Name", playtimeForever: 10, iconUrl: null },
          { appId: 222, name: "Valid Game", playtimeForever: 300, iconUrl: null },
        ],
      }),
    };

    const rawgService = {
      searchGames: vi
        .fn()
        .mockRejectedValueOnce(new Error("RAWG temporary error"))
        .mockResolvedValueOnce({ items: [], pagination: { totalItems: 0, page: 1, pageSize: 1, totalPages: 0 } }),
    };

    const worker = new SteamSyncWorkerService({ prisma, steamService, rawgService });

    await worker.processSyncJob({
      syncJobId: syncJob.id,
      userId: user.id,
      steamId: "76561198000000000",
      platformId: platform.id,
    });

    const finishedJob = await prisma.syncJob.findUniqueOrThrow({ where: { id: syncJob.id } });
    const userGames = await prisma.userGame.findMany({ where: { userId: user.id } });

    expect(finishedJob.status).toBe("COMPLETED");
    expect(finishedJob.processedItems).toBe(2);
    expect(userGames).toHaveLength(1);
  });

  it("should mark SyncJob as FAILED when fatal error happens", async () => {
    const user = await prisma.user.create({ data: { username: "worker_user_4" } });
    const platform = await prisma.platform.create({
      data: { userId: user.id, name: "PC", manufacturer: "Various" },
    });

    const syncJob = await prisma.syncJob.create({
      data: { userId: user.id, type: "STEAM", status: "PENDING" },
    });

    const steamService = {
      getOwnedGames: vi.fn().mockRejectedValue(new Error("Steam unavailable")),
    };

    const rawgService = {
      searchGames: vi.fn(),
    };

    const worker = new SteamSyncWorkerService({ prisma, steamService, rawgService });

    await expect(
      worker.processSyncJob({
        syncJobId: syncJob.id,
        userId: user.id,
        steamId: "76561198000000000",
        platformId: platform.id,
      })
    ).rejects.toThrow();

    const failedJob = await prisma.syncJob.findUniqueOrThrow({ where: { id: syncJob.id } });
    expect(failedJob.status).toBe("FAILED");
    expect(failedJob.errorMessage).toContain("Steam unavailable");
  });
});
