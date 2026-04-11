// packages/shared/src/dto/steam.ts
// Steam sync DTOs

import type { JobStatus, SyncType } from "../enums";

export interface SteamSyncRequestDTO {
  steamId: string;
  platformId: string; // Which local Platform to associate imported games with
}

export interface SyncJobDTO {
  id: string;
  userId: string;
  type: SyncType;
  status: JobStatus;
  totalItems: number;
  processedItems: number;
  errorMessage: string | null;
  startedAt: string;   // ISO 8601
  completedAt: string | null; // ISO 8601
}
