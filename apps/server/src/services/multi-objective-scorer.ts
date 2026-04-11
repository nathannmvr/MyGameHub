// apps/server/src/services/multi-objective-scorer.ts
// Multi-objective recommendation scoring formula
// Ref: design.md §6.3, spec.md RN-14

import type {
  RecommendationProfile,
  ScoreBreakdown as ScoreBreakdownDTO
} from "@gamehub/shared";

export interface GameForScoring {
  rawgId: number;
  title: string;
  genres: string[];
  platforms: string[];
  releaseDate: Date | null;
  metacritic: number | null;
}

export interface UserProfileData {
  profile: RecommendationProfile;
  userGenres: string[];
  userTags: string[];
  userPlatforms: string[];
  userGameIds: number[];
  droppedGameIds: number[];
  lowRatedGameIds: number[];
}

/**
 * Multi-objective scoring formula for Fase 16 recommendation engine
 *
 * Formula:
 *   score(game) = w_a*A(game) + w_d*D(game) + w_n*N(game) + w_r*R(game) - w_p*P(game)
 *
 * Where:
 *   A = affinity (0-100): overlap with user genres/tags
 *   D = diversity (0-1): penalty for similarity to already-ranked
 *   N = novelty (0-50): boost for unexplored games
 *   R = robustness (0-50): trending/popularity boost
 *   P = penalty (0-∞): dropped/low-rated penalty
 *   w_* = weights (different per profile)
 */
export class MultiObjectiveScorer {
  // Profile-specific weights
  private readonly CONSERVATIVE_WEIGHTS = {
    affinity: 0.5,
    diversity: 0.15,
    novelty: 0.1,
    robustness: 0.1,
    penalty: 0.15,
  };

  private readonly EXPLORATORY_WEIGHTS = {
    affinity: 0.3,
    diversity: 0.2,
    novelty: 0.25,
    robustness: 0.15,
    penalty: 0.1,
  };

  getWeights(profile: RecommendationProfile) {
    return profile === "conservative"
      ? this.CONSERVATIVE_WEIGHTS
      : this.EXPLORATORY_WEIGHTS;
  }

  /**
   * Calculate affinity score (0-100)
   * Based on overlap between game genres/tags and user preferences
   */
  calculateAffinity(
    game: GameForScoring,
    userProfile: UserProfileData
  ): number {
    let score = 0;
    let matchCount = 0;

    // Genre overlap (weighted more heavily)
    const genreMatches = game.genres.filter((g) =>
      userProfile.userGenres.includes(g)
    );
    score += genreMatches.length * 8; // 8 points per genre match
    matchCount += genreMatches.length;

    // Apply generic genre deboot (action, adventure, indie are weak signals)
    const genericGenreMultiplier: Record<string, number> = {
      action: 0.45,
      adventure: 0.55,
      indie: 0.6,
    };

    for (const genre of game.genres) {
      const multiplier = genericGenreMultiplier[genre.toLowerCase()] ?? 1;
      score *= multiplier;
    }

    // Clamp to 0-100
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate diversity diversity penalty (0-1)
   * Penalize games similar to already-ranked games
   */
  calculateDiversity(
    game: GameForScoring,
    rankedSoFar: GameForScoring[],
    _userProfile: UserProfileData
  ): number {
    if (rankedSoFar.length === 0) {
      return 1; // No penalty if nothing ranked yet
    }

    // Calculate average genre overlap with ranked games
    let totalOverlap = 0;
    for (const rankedGame of rankedSoFar) {
      const intersection = game.genres.filter((g) =>
        rankedGame.genres.includes(g)
      );
      const union = new Set([...game.genres, ...rankedGame.genres]);
      const jaccardSimilarity = intersection.length / union.size;
      totalOverlap += jaccardSimilarity;
    }

    const avgSimilarity = totalOverlap / rankedSoFar.length;

    // Penalty: higher similarity = lower diversity penalty
    // If avgSimilarity = 0.8 (very similar), penalty ≈ 0.2
    // If avgSimilarity = 0.2 (dissimilar), penalty ≈ 0.8
    return 1 - avgSimilarity;
  }

  /**
   * Calculate novelty boost (0-50)
   * Boost games not yet played/explored by user
   */
  calculateNovelty(game: GameForScoring, userProfile: UserProfileData): number {
    // If game in user library, no boost
    if (
      userProfile.userGameIds.includes(game.rawgId) ||
      userProfile.droppedGameIds.includes(game.rawgId) ||
      userProfile.lowRatedGameIds.includes(game.rawgId)
    ) {
      return 0;
    }

    // Boost for unexplored games (e.g., new releases)
    if (game.releaseDate) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      if (game.releaseDate >= ninetyDaysAgo) {
        return 50; // Full boost for recent releases
      }
    }

    return 10; // Base novelty for old but unexplored games
  }

  /**
   * Calculate robustness boost (0-50)
   * Boost popular/trending games
   */
  calculateRobustness(game: GameForScoring, _userProfile: UserProfileData): number {
    if (!game.metacritic) {
      return 0; // No data, no boost
    }

    // Metacritic 0-100, map to 0-50 boost
    if (game.metacritic >= 80) return 50;
    if (game.metacritic >= 70) return 35;
    if (game.metacritic >= 60) return 20;
    return 5;
  }

  /**
   * Calculate penalties
   * Penalize dropped/low-rated games
   */
  calculatePenalties(
    game: GameForScoring,
    userProfile: UserProfileData
  ): number {
    let penalty = 0;

    // Heavy penalty for dropped games
    if (userProfile.droppedGameIds.includes(game.rawgId)) {
      penalty += 15;
    }

    // Moderate penalty for low-rated games
    if (userProfile.lowRatedGameIds.includes(game.rawgId)) {
      penalty += 8;
    }

    return penalty;
  }

  /**
   * Final multi-objective scoring
   */
  score(
    game: GameForScoring,
    userProfile: UserProfileData,
    rankedSoFar: GameForScoring[] = []
  ): ScoreBreakdownDTO {
    const weights = this.getWeights(userProfile.profile);

    const affinity = this.calculateAffinity(game, userProfile);
    const diversity = this.calculateDiversity(game, rankedSoFar, userProfile);
    const novelty = this.calculateNovelty(game, userProfile);
    const robustness = this.calculateRobustness(game, userProfile);
    const penalty = this.calculatePenalties(game, userProfile);

    const final =
      weights.affinity * affinity +
      weights.diversity * diversity +
      weights.novelty * novelty +
      weights.robustness * robustness -
      weights.penalty * penalty;

    return {
      affinity,
      diversity,
      novelty,
      robustness,
      penalty,
      final: Math.max(0, final), // No negative scores
    };
  }

  /**
   * Rank and return top-K games with scores
   */
  rankGames(
    games: GameForScoring[],
    userProfile: UserProfileData,
    topK: number = 20
  ): Array<{
    game: GameForScoring;
    scoreBreakdown: ScoreBreakdownDTO;
  }> {
    const scored = games.map((game) => ({
      game,
      scoreBreakdown: this.score(game, userProfile, []),
    }));

    // Sort by final score (descending)
    scored.sort((a, b) => b.scoreBreakdown.final - a.scoreBreakdown.final);

    // Re-rank considering diversity as we go
    const ranked = [];
    for (const item of scored) {
      if (ranked.length >= topK) break;

      // Recalculate with diversity considering already-ranked
      const updatedScore = this.score(
        item.game,
        userProfile,
        ranked.map((r) => r.game)
      );

      ranked.push({
        game: item.game,
        scoreBreakdown: updatedScore,
      });
    }

    return ranked;
  }
}
