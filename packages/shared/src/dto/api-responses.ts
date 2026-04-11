// packages/shared/src/dto/api-responses.ts
// Standard API response wrappers and expanded DTOs

import type { GameStatus } from "../enums";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;     // e.g. "PLATFORM_NOT_FOUND", "GAME_ALREADY_IN_LIBRARY"
    message: string;  // Human-readable message
    details?: unknown; // Extra details (Zod validation, etc.)
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface GameSearchResult {
  rawgId: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  releaseDate: string | null;
  genres: string[];
  platforms: string[];
  metacritic: number | null;
  alreadyInLibrary: boolean; // Cross-referenced with local data
}

export interface DashboardStats {
  totalGames: number;
  byStatus: Record<GameStatus, number>;
  totalPlaytimeHours: number;
  gamesCompletedThisYear: number;
  continuePlaying: LibraryItemExpanded[];
}

export interface LibraryItemExpanded {
  id: string;
  status: GameStatus;
  rating: number | null;
  playtimeHours: number | null;
  review: string | null;
  addedAt: string;
  game: {
    id: string;
    title: string;
    coverUrl: string | null;
    developer: string | null;
    genres: string[];
  };
  platform: {
    id: string;
    name: string;
    icon: string;
  };
}
