// packages/shared/src/dto/score-breakdown.ts
// Score breakdown for transparency in recommendation ranking
// Ref: design.md §6.3, spec.md RN-15

export interface ScoreBreakdown {
  affinity: number;      // 0-100: overlap with user genres/tags
  diversity: number;    // 0-1: penalty for similarity to already-ranked
  novelty: number;       // 0-50: boost for unexplored games
  robustness: number;   // 0-50: trending/popularity boost
  penalty: number;       // 0-∞: dropped/low-rated penalty
  final: number;         // final weighted score
}
