// @gamehub/shared — Barrel export
// Domain types, DTOs, enums, and contracts shared between frontend and backend

// ─── Enums ───
export { GameStatus, JobStatus, SyncType } from "./enums";

// ─── Domain Types ───
export type { Platform, CreatePlatformDTO, UpdatePlatformDTO } from "./domain/platform";
export type { Game } from "./domain/game";
export type { User, UpdateUserDTO } from "./domain/user";
export type {
  LibraryItem,
  AddToLibraryDTO,
  UpdateLibraryItemDTO,
} from "./domain/library";

// ─── DTOs ───
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  GameSearchResult,
  DashboardStats,
  LibraryItemExpanded,
} from "./dto/api-responses";
export type { SteamSyncRequestDTO, SyncJobDTO } from "./dto/steam";

// ─── Contracts ───
export { API_PREFIX, API_ROUTES } from "./contracts/api-routes";
