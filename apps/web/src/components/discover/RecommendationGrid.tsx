import type { GameSearchResult } from '@gamehub/shared';
import { RecommendationCard } from './RecommendationCard';

interface RecommendationGridProps {
  recommendations: GameSearchResult[];
  onAdd: (recommendation: GameSearchResult) => void;
  onDismiss: (recommendation: GameSearchResult) => void;
}

export function RecommendationGrid({ recommendations, onAdd, onDismiss }: RecommendationGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {recommendations.map((recommendation) => (
        <RecommendationCard key={recommendation.rawgId} recommendation={recommendation} onAdd={onAdd} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
