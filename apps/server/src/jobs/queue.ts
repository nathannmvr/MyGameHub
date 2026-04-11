// src/jobs/queue.ts
// BullMQ queue configuration for Steam sync jobs.

import { Queue } from "bullmq";
import { getRedisConfig } from "../config/redis.js";
import { STEAM_SYNC_QUEUE_NAME, type SteamSyncJobData } from "./steam-sync.job.js";

let steamSyncQueue: Queue<SteamSyncJobData> | null = null;

function getQueue(): Queue<SteamSyncJobData> {
  if (!steamSyncQueue) {
    const redis = getRedisConfig();
    steamSyncQueue = new Queue<SteamSyncJobData>(STEAM_SYNC_QUEUE_NAME, {
      connection: {
        host: redis.host,
        port: redis.port,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  return steamSyncQueue;
}

export async function enqueueSteamSyncJob(data: SteamSyncJobData): Promise<string> {
  const job = await getQueue().add("sync", data);
  return job.id?.toString() ?? "";
}

export async function closeQueues(): Promise<void> {
  if (steamSyncQueue) {
    await steamSyncQueue.close();
    steamSyncQueue = null;
  }
}
