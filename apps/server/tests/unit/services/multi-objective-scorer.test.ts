// apps/server/tests/unit/services/multi-objective-scorer.test.ts
// TDD tests for MultiObjectiveScorer
// Ref: spec.md RN-14, design.md §6.3

import { describe, it, expect } from "vitest";
import {
  MultiObjectiveScorer,
  type GameForScoring,
  type UserProfileData,
} from "../../../src/services/multi-objective-scorer";

describe("MultiObjectiveScorer", () => {
  const scorer = new MultiObjectiveScorer();

  // Test fixtures
  const mockGame1: GameForScoring = {
    rawgId: 1,
    title: "Action RPG",
    genres: ["action", "rpg"],
    platforms: ["pc"],
    releaseDate: new Date("2024-01-01"),
    metacritic: 85,
  };

  const mockGame2: GameForScoring = {
    rawgId: 2,
    title: "Indie Puzzle",
    genres: ["indie", "puzzle"],
    platforms: ["nintendo switch"],
    releaseDate: new Date("2025-03-01"),
    metacritic: 72,
  };

  const mockUserProfile: UserProfileData = {
    profile: "conservative",
    userGenres: ["action", "rpg", "strategy"],
    userTags: ["tactical", "turn-based"],
    userPlatforms: ["pc"],
    userGameIds: [10, 20], // Already played
    droppedGameIds: [30],
    lowRatedGameIds: [40],
  };

  describe("calculateAffinity", () => {
    it("should return high affinity for matching genres", () => {
      const affinity = scorer.calculateAffinity(mockGame1, mockUserProfile);
      expect(affinity).toBeGreaterThan(0);
      expect(affinity).toBeLessThanOrEqual(100);
    });

    it("should return lower affinity for games without matching genres", () => {
      const game = { ...mockGame1, genres: ["sports", "racing"] };
      const affinity = scorer.calculateAffinity(game, mockUserProfile);
      expect(affinity).toBeLessThan(50);
    });

    it("should penalize generic genres (action, adventure, indie)", () => {
      const game = { ...mockGame1, genres: ["action"] };
      const affinityWithGeneric = scorer.calculateAffinity(
        game,
        mockUserProfile
      );

      const game2 = { ...mockGame1, genres: ["strategy"] };
      const affinityWithSpecific = scorer.calculateAffinity(
        game2,
        mockUserProfile
      );

      // Specific genre should have higher affinity
      expect(affinityWithSpecific).toBeGreaterThan(affinityWithGeneric);
    });
  });

  describe("calculateDiversity", () => {
    it("should return 1 (no penalty) when no games ranked yet", () => {
      const diversity = scorer.calculateDiversity(
        mockGame1,
        [],
        mockUserProfile
      );
      expect(diversity).toBe(1);
    });

    it("should penalize similar games", () => {
      const similarGame = { ...mockGame1, rawgId: 999 };
      const diversity = scorer.calculateDiversity(
        mockGame1,
        [similarGame],
        mockUserProfile
      );
      // Two identical games = 100% similarity = 0 diversity
      expect(diversity).toBe(0);
    });

    it("should favor dissimilar games", () => {
      // mockGame2 has different genres (indie, puzzle) vs mockGame1 (action, rpg)
      const diversity = scorer.calculateDiversity(
        mockGame2,
        [mockGame1],
        mockUserProfile
      );
      expect(diversity).toBeCloseTo(1, 1); // Should be closer to 1 (high diversity)
    });
  });

  describe("calculateNovelty", () => {
    it("should return 0 for games already in user library", () => {
      const game = { ...mockGame1, rawgId: 10 }; // In userGameIds
      const novelty = scorer.calculateNovelty(game, mockUserProfile);
      expect(novelty).toBe(0);
    });

    it("should return 0 for dropped games", () => {
      const game = { ...mockGame1, rawgId: 30 }; // In droppedGameIds
      const novelty = scorer.calculateNovelty(game, mockUserProfile);
      expect(novelty).toBe(0);
    });

    it("should return high novelty for recent releases", () => {
      const recentGame = {
        ...mockGame1,
        rawgId: 999,
        releaseDate: new Date(), // Today
      };
      const novelty = scorer.calculateNovelty(recentGame, mockUserProfile);
      expect(novelty).toBe(50); // Full boost
    });

    it("should return base novelty for old unexplored games", () => {
      const oldGame = {
        ...mockGame1,
        rawgId: 999,
        releaseDate: new Date("2020-01-01"), // Old
      };
      const novelty = scorer.calculateNovelty(oldGame, mockUserProfile);
      expect(novelty).toBe(10); // Base novelty
    });
  });

  describe("calculateRobustness", () => {
    it("should return 0 for games without metacritic score", () => {
      const gameNoScore = { ...mockGame1, metacritic: null };
      const robustness = scorer.calculateRobustness(
        gameNoScore,
        mockUserProfile
      );
      expect(robustness).toBe(0);
    });

    it("should return 50 for high-quality games (metacritic >= 80)", () => {
      const game = { ...mockGame1, metacritic: 85 };
      const robustness = scorer.calculateRobustness(game, mockUserProfile);
      expect(robustness).toBe(50);
    });

    it("should return 35 for mid-quality games (70-80)", () => {
      const game = { ...mockGame1, metacritic: 75 };
      const robustness = scorer.calculateRobustness(game, mockUserProfile);
      expect(robustness).toBe(35);
    });

    it("should return 20 for low-quality games (60-70)", () => {
      const game = { ...mockGame1, metacritic: 65 };
      const robustness = scorer.calculateRobustness(game, mockUserProfile);
      expect(robustness).toBe(20);
    });
  });

  describe("calculatePenalties", () => {
    it("should penalize dropped games heavily (15 penalty)", () => {
      const game = { ...mockGame1, rawgId: 30 }; // In droppedGameIds
      const penalty = scorer.calculatePenalties(game, mockUserProfile);
      expect(penalty).toBe(15);
    });

    it("should penalize low-rated games moderately (8 penalty)", () => {
      const game = { ...mockGame1, rawgId: 40 }; // In lowRatedGameIds
      const penalty = scorer.calculatePenalties(game, mockUserProfile);
      expect(penalty).toBe(8);
    });

    it("should combine penalties", () => {
      const profile = {
        ...mockUserProfile,
        droppedGameIds: [...mockUserProfile.droppedGameIds, 999],
        lowRatedGameIds: [...mockUserProfile.lowRatedGameIds, 999],
      };
      const game = { ...mockGame1, rawgId: 999 };
      const penalty = scorer.calculatePenalties(game, profile);
      expect(penalty).toBe(15 + 8); // Both penalties apply
    });
  });

  describe("score", () => {
    it("should return ScoreBreakdown with all components", () => {
      const scoreBreakdown = scorer.score(
        mockGame1,
        mockUserProfile,
        []
      );

      expect(scoreBreakdown).toHaveProperty("affinity");
      expect(scoreBreakdown).toHaveProperty("diversity");
      expect(scoreBreakdown).toHaveProperty("novelty");
      expect(scoreBreakdown).toHaveProperty("robustness");
      expect(scoreBreakdown).toHaveProperty("penalty");
      expect(scoreBreakdown).toHaveProperty("final");
    });

    it("should never return negative final scores", () => {
      const penaltyGame = {
        ...mockGame1,
        rawgId: 30, // Dropped
        genres: [], // No affinity
      };
      const scoreBreakdown = scorer.score(
        penaltyGame,
        mockUserProfile,
        []
      );
      expect(scoreBreakdown.final).toBeGreaterThanOrEqual(0);
    });

    it("should apply different weights for conservative vs exploratory profiles", () => {
      const conservativeProfile = {
        ...mockUserProfile,
        profile: "conservative" as const,
      };
      const exploratoryProfile = {
        ...mockUserProfile,
        profile: "exploratory" as const,
      };

      const conservativeScore = scorer.score(
        mockGame1,
        conservativeProfile,
        []
      );
      const exploratoryScore = scorer.score(
        mockGame1,
        exploratoryProfile,
        []
      );

      // Exploratory should prioritize novelty/diversity
      const conservativeDiversity = conservativeScore.diversity;
      const exploratoryDiversity = exploratoryScore.diversity;

      // Exploratory weights diversity more, so the final score might be different
      expect(conservativeScore.final).not.toBe(exploratoryScore.final);
    });
  });

  describe("rankGames", () => {
    it("should return games ranked by score", () => {
      const games = [mockGame1, mockGame2];
      const ranked = scorer.rankGames(games, mockUserProfile, 10);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].scoreBreakdown.final).toBeGreaterThanOrEqual(
        ranked[1].scoreBreakdown.final
      );
    });

    it("should respect topK limit", () => {
      const manyGames = Array.from({ length: 50 }, (_, i) => ({
        ...mockGame1,
        rawgId: i,
      }));
      const ranked = scorer.rankGames(manyGames, mockUserProfile, 10);

      expect(ranked.length).toBeLessThanOrEqual(10);
    });

    it("should apply diversity penalty during ranking", () => {
      // First game should have diversity penalty = 1 (no penalty)
      // Second game should have lower diversity score due to similarity
      const games = [mockGame1, mockGame1]; // Same game twice
      const ranked = scorer.rankGames(games, mockUserProfile, 2);

      // Second game should have lower final score due to diversity penalty
      if (ranked.length > 1) {
        expect(ranked[1].scoreBreakdown.final).toBeLessThan(
          ranked[0].scoreBreakdown.final
        );
      }
    });
  });

  describe("getWeights", () => {
    it("should return conservative weights", () => {
      const weights = scorer.getWeights("conservative");
      expect(weights.affinity).toBe(0.5);
      expect(weights.diversity).toBe(0.15);
      expect(weights.penalty).toBe(0.15);
    });

    it("should return exploratory weights", () => {
      const weights = scorer.getWeights("exploratory");
      expect(weights.affinity).toBe(0.3);
      expect(weights.novelty).toBe(0.25);
      expect(weights.penalty).toBe(0.1);
    });

    it("exploratory should emphasize novelty and diversity over conservative", () => {
      const conservativeWeights = scorer.getWeights("conservative");
      const exploratoryWeights = scorer.getWeights("exploratory");

      expect(exploratoryWeights.novelty).toBeGreaterThan(
        conservativeWeights.novelty
      );
      expect(exploratoryWeights.diversity).toBeGreaterThan(
        conservativeWeights.diversity
      );
    });
  });
});
