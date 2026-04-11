import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameStatus, type GameSearchResult } from '@gamehub/shared';
import { useDiscover } from '../hooks/use-discover';
import { useLibrary } from '../hooks/use-library';
import { usePlatforms } from '../hooks/use-platforms';
import { RecommendationGrid } from '../components/discover/RecommendationGrid';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

function DiscoverSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="space-y-4">
        <Skeleton className="h-4 w-36 rounded-full" />
        <Skeleton className="h-12 w-full max-w-2xl rounded-3xl" />
        <Skeleton className="h-6 w-full max-w-2xl rounded-2xl" />
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-[360px] rounded-[1.75rem]" />
        ))}
      </div>
    </div>
  );
}

export function DiscoverPage() {
  const navigate = useNavigate();
  const discoverQuery = useDiscover(1);
  const platformsQuery = usePlatforms();
  const libraryQuery = useLibrary();
  const [selectedRecommendation, setSelectedRecommendation] = useState<GameSearchResult | null>(null);
  const [platformId, setPlatformId] = useState('');
  const [status, setStatus] = useState<GameStatus>(GameStatus.BACKLOG);

  const recommendations = useMemo(() => discoverQuery.data?.data ?? [], [discoverQuery.data]);
  const platforms = platformsQuery.data ?? [];
  const effectivePlatformId = platformId || platforms[0]?.id || '';

  if (discoverQuery.isLoading || platformsQuery.isLoading) {
    return <DiscoverSkeleton />;
  }

  if (discoverQuery.isError || platformsQuery.isError) {
    return <ErrorState title="Não foi possível carregar as recomendações" description="A API devolveu um erro. Tenta novamente em instantes." onRetry={() => void Promise.all([discoverQuery.refetch(), platformsQuery.refetch()])} />;
  }

  const addRecommendation = async () => {
    if (!selectedRecommendation || !effectivePlatformId) {
      return;
    }

    await libraryQuery.addLibraryItem.mutateAsync({
      rawgId: selectedRecommendation.rawgId,
      platformId: effectivePlatformId,
      status,
    });

    setSelectedRecommendation(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-text-secondary">Descobrir</p>
        <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">Recomendações filtradas pelas tuas plataformas.</h1>
        <p className="max-w-2xl text-text-secondary">O botão adicionar abre um modal rápido para escolher status e plataforma antes de gravar na biblioteca.</p>
      </section>

      {recommendations.length > 0 ? (
        <RecommendationGrid recommendations={recommendations} onAdd={(recommendation) => setSelectedRecommendation(recommendation)} />
      ) : (
        <EmptyState
          title="Sem recomendações por agora"
          description={
            platforms.length === 0
              ? 'Adiciona plataformas ativas para receber sugestões filtradas pelo teu hardware.'
              : 'Ainda não há recomendações relevantes com base na tua biblioteca atual.'
          }
          actionLabel={platforms.length === 0 ? 'Ir para plataformas' : 'Abrir biblioteca'}
          onAction={() => navigate(platforms.length === 0 ? '/platforms' : '/library')}
        />
      )}

      <Modal
        open={selectedRecommendation !== null}
        onClose={() => setSelectedRecommendation(null)}
        title={selectedRecommendation?.title ?? 'Adicionar recomendação'}
        footer={(
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSelectedRecommendation(null)}>Cancelar</Button>
            <Button onClick={() => void addRecommendation()} disabled={!effectivePlatformId}>Adicionar</Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Escolhe como este jogo será adicionado à tua biblioteca.</p>
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as GameStatus)}>
            {Object.values(GameStatus).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </Select>
          <Select label="Plataforma" value={effectivePlatformId} onChange={(event) => setPlatformId(event.target.value)}>
            <option value="">Seleciona uma plataforma</option>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>{platform.name}</option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
