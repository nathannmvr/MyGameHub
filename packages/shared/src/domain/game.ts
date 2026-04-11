// packages/shared/src/domain/game.ts
// Game (catalog) domain types

export interface Game {
  id: string;
  rawgId: number | null;
  rawgSlug: string | null;
  steamAppId: number | null;
  title: string;
  coverUrl: string | null;
  backgroundUrl: string | null;
  developer: string | null;
  publisher: string | null;
  releaseDate: string | null; // ISO 8601
  description: string | null;
  genres: string[];
  tags: string[];
  platforms: string[]; // Platform names where the game is available (from RAWG)
  metacritic: number | null;
}
