import type { GameSearchResult } from '@gamehub/shared';
import { Button } from '../ui/Button';

interface RecommendationCardProps {
  recommendation: GameSearchResult;
  onAdd: (recommendation: GameSearchResult) => void;
}

export function RecommendationCard({ recommendation, onAdd }: RecommendationCardProps) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-background-card/80 shadow-lg shadow-black/20">
      <div className="aspect-[16/10] bg-background-hover">
        {recommendation.coverUrl ? <img src={recommendation.coverUrl} alt={recommendation.title} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">{recommendation.platforms.join(' · ') || 'Plataformas indisponíveis'}</p>
          <h3 className="mt-2 text-lg font-semibold text-text-primary">{recommendation.title}</h3>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
          <span>{recommendation.genres.join(' · ') || 'Sem géneros'}</span>
          <span>{recommendation.metacritic ?? 'N/A'}</span>
        </div>
        <Button variant="secondary" className="w-full" onClick={() => onAdd(recommendation)}>
          Adicionar
        </Button>
      </div>
    </article>
  );
}
