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
  RecommendationFeedbackDTO,
  RecommendationProfile,
  GameSearchResult,
  DashboardStats,
  LibraryItemExpanded,
} from "./dto/api-responses";
export type { SteamSyncRequestDTO, SyncJobDTO } from "./dto/steam";
export { RecommendationReason, recommendationReasonLabels } from "./dto/recommendation-reason";
export type { ScoreBreakdown } from "./dto/score-breakdown";
export { RecommendationEventType } from "./dto/recommendation-event";

// ─── Contracts ───
export { API_PREFIX, API_ROUTES } from "./contracts/api-routes";
