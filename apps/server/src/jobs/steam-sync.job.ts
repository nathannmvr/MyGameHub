// src/jobs/steam-sync.job.ts
// Steam sync BullMQ job payload contract.

export interface SteamSyncJobData {
  syncJobId: string;
  userId: string;
  steamId: string;
  platformId: string;
}

export const STEAM_SYNC_QUEUE_NAME = "steam-sync";
