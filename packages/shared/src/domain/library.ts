// packages/shared/src/domain/library.ts
// Library (UserGame pivot) domain types

import type { GameStatus } from "../enums";
import type { Game } from "./game";
import type { Platform } from "./platform";

export interface LibraryItem {
  id: string;
  userId: string;
  gameId: string;
  platformId: string;
  status: GameStatus;
  rating: number | null; // 1-10
  playtimeHours: number | null;
  review: string | null;
  addedAt: string; // ISO 8601
  updatedAt: string; // ISO 8601

  // Expanded relations (when included via query)
  game?: Game;
  platform?: Platform;
}

export interface AddToLibraryDTO {
  rawgId?: number;
  title?: string;
  coverUrl?: string;
  platformId: string;
  status: GameStatus;
  rating?: number;
  playtimeHours?: number;
  review?: string;
}

export interface UpdateLibraryItemDTO {
  platformId?: string;
  status?: GameStatus;
  rating?: number | null;
  playtimeHours?: number | null;
  review?: string | null;
}
