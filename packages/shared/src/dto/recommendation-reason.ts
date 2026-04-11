// packages/shared/src/dto/recommendation-reason.ts
// Recommendation reason enum for explainability
// Ref: spec.md RN-15, design.md §6.3

export enum RecommendationReason {
  GENRE_AFFINITY = "GENRE_AFFINITY",
  SIMILAR_TO_PLAYING = "SIMILAR_TO_PLAYING",
  TRENDING_ON_PLATFORM = "TRENDING_ON_PLATFORM",
  NEW_RELEASE_MATCH = "NEW_RELEASE_MATCH",
}

export const recommendationReasonLabels: Record<RecommendationReason, string> = {
  [RecommendationReason.GENRE_AFFINITY]: "Matches your favorite genres",
  [RecommendationReason.SIMILAR_TO_PLAYING]: "Similar to a game you're playing",
  [RecommendationReason.TRENDING_ON_PLATFORM]: "Trending on your platform",
  [RecommendationReason.NEW_RELEASE_MATCH]: "New release matching your interests",
};
