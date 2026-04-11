// packages/shared/src/enums.ts
// Domain enums shared between frontend and backend

export enum GameStatus {
  WISHLIST = "WISHLIST",
  BACKLOG  = "BACKLOG",
  PLAYING  = "PLAYING",
  PLAYED   = "PLAYED",
  DROPPED  = "DROPPED",
}

export enum JobStatus {
  PENDING   = "PENDING",
  RUNNING   = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED    = "FAILED",
}

export enum SyncType {
  STEAM = "STEAM",
}
