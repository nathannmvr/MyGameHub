import type { GameSearchResult } from '@gamehub/shared';
import { useEffect } from 'react';
import { Button } from '../ui/Button';
import { RecommendationReason } from './RecommendationReason';

interface RecommendationCardProps {
  recommendation: GameSearchResult;
  onAdd: (recommendation: GameSearchResult) => void;
  onDismiss: (recommendation: GameSearchResult) => void;
  onImpression?: (recommendation: GameSearchResult) => void;
}

export function RecommendationCard({ recommendation, onAdd, onDismiss, onImpression }: RecommendationCardProps) {
  useEffect(() => {
    onImpression?.(recommendation);
  }, [onImpression, recommendation]);

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-background-card/80 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-primary/10">
      <div className="aspect-[16/10] bg-background-hover">
        {recommendation.coverUrl ? (
          <img src={recommendation.coverUrl} alt={recommendation.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">{recommendation.platforms.join(' · ') || 'Plataformas indisponíveis'}</p>
          <h3 className="mt-2 text-lg font-semibold text-text-primary">{recommendation.title}</h3>
          <div className="mt-3">
            <RecommendationReason reason={recommendation.reason} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
          <span>{recommendation.genres.join(' · ') || 'Sem géneros'}</span>
          <span>{recommendation.metacritic ?? 'N/A'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="w-full" onClick={() => onAdd(recommendation)}>
            Adicionar
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onDismiss(recommendation)}>
            Nao recomendar
          </Button>
        </div>
      </div>
    </article>
  );
}
