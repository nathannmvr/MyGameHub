// src/schemas/index.ts
// Barrel export for all Zod validation schemas

// ─── Platform ───
export {
  CreatePlatformSchema,
  UpdatePlatformSchema,
  type CreatePlatformInput,
  type UpdatePlatformInput,
} from "./platform.schema.js";

// ─── Library ───
export {
  AddToLibrarySchema,
  UpdateLibraryItemSchema,
  LibraryQuerySchema,
  type AddToLibraryInput,
  type UpdateLibraryItemInput,
  type LibraryQueryInput,
} from "./library.schema.js";

// ─── Games ───
export {
  GameSearchQuerySchema,
  GameDetailsParamSchema,
  type GameSearchQueryInput,
  type GameDetailsParamInput,
} from "./games.schema.js";

// ─── Steam ───
export {
  SteamSyncSchema,
  SteamSyncStatusParamSchema,
  type SteamSyncInput,
  type SteamSyncStatusParamInput,
} from "./steam.schema.js";

// ─── Discover ───
export {
  DiscoverQuerySchema,
  RecommendationFeedbackSchema,
  type DiscoverQueryInput,
  type RecommendationFeedbackInput,
} from "./discover.schema.js";

// ─── Auth ───
export {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "./auth.schema.js";
