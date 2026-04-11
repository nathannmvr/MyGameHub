import { RecommendationReason as RecommendationReasonEnum } from '@gamehub/shared';

interface RecommendationReasonProps {
  reason: RecommendationReasonEnum;
}

const reasonMap: Record<RecommendationReasonEnum, { label: string; className: string }> = {
  [RecommendationReasonEnum.GENRE_AFFINITY]: {
    label: 'Combina com seus generos favoritos',
    className: 'border-blue-300/30 bg-blue-400/10 text-blue-200',
  },
  [RecommendationReasonEnum.SIMILAR_TO_PLAYING]: {
    label: 'Parecido com jogos que voce esta jogando',
    className: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-200',
  },
  [RecommendationReasonEnum.TRENDING_ON_PLATFORM]: {
    label: 'Em alta na sua plataforma',
    className: 'border-amber-300/30 bg-amber-400/10 text-amber-200',
  },
  [RecommendationReasonEnum.NEW_RELEASE_MATCH]: {
    label: 'Lancamento com seu perfil',
    className: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
  },
};

export function RecommendationReason({ reason }: RecommendationReasonProps) {
  const reasonData = reasonMap[reason] ?? reasonMap[RecommendationReasonEnum.GENRE_AFFINITY];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${reasonData.className}`}
      aria-label={`Motivo da recomendacao: ${reasonData.label}`}
      title={reasonData.label}
    >
      {reasonData.label}
    </span>
  );
}
