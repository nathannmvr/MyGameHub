import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../hooks/use-library';
import { usePlatforms } from '../hooks/use-platforms';
import { Button } from '../components/ui/Button';
import { LibraryFilters, type LibraryFiltersValue } from '../components/library/LibraryFilters';
import { GameGrid } from '../components/library/GameGrid';
import { GameCard } from '../components/library/GameCard';
import { AddGameModal } from '../components/library/AddGameModal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

function LibrarySkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-12 w-full max-w-xl rounded-3xl" />
          <Skeleton className="h-6 w-full max-w-2xl rounded-2xl" />
        </div>
        <Skeleton className="h-11 w-36 rounded-full" />
      </section>

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-background-card/80 p-5 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-[420px] rounded-[1.75rem]" />
        ))}
      </div>
    </div>
  );
}

export function LibraryPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<LibraryFiltersValue>({ sort: 'added', order: 'desc' });
  const [openAddModal, setOpenAddModal] = useState(false);
  const libraryQuery = useLibrary(filters);
  const platformsQuery = usePlatforms();

  const items = useMemo(() => libraryQuery.data?.data ?? [], [libraryQuery.data]);
  const pagination = libraryQuery.data?.pagination;
  const hasActiveFilters = Boolean(filters.status || filters.platformId || filters.search?.trim() || filters.sort !== 'added' || filters.order !== 'desc');

  if (libraryQuery.isLoading || platformsQuery.isLoading) {
    return <LibrarySkeleton />;
  }

  if (libraryQuery.isError || platformsQuery.isError) {
    return <ErrorState title="Não foi possível carregar a biblioteca" description="A consulta falhou. Tenta novamente ou verifica a API." onRetry={() => void Promise.all([libraryQuery.refetch(), platformsQuery.refetch()])} />;
  }

  const platforms = platformsQuery.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-text-secondary">Biblioteca</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-text-primary sm:text-4xl">A tua coleção unificada.</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">
            Filtra, ordena e adiciona jogos diretamente da pesquisa RAWG.
          </p>
        </div>
        <Button onClick={() => setOpenAddModal(true)}>Adicionar jogo</Button>
      </section>

      <LibraryFilters value={filters} platforms={platforms} onChange={setFilters} />

      {items.length > 0 ? (
        <GameGrid>
          {items.map((item) => (
            <GameCard
              key={item.id}
              id={item.id}
              title={item.game.title}
              coverUrl={item.game.coverUrl}
              statusLabel={item.status}
              subtitle={item.platform.name}
              metadata={`${item.game.genres.join(' · ') || 'Sem géneros'}${item.rating ? ` · Nota ${item.rating}` : ''}`}
              href={`/library/${item.id}`}
            />
          ))}
        </GameGrid>
      ) : (
        <EmptyState
          title={hasActiveFilters ? 'Nenhum jogo encontrado' : 'A biblioteca ainda está vazia'}
          description={
            hasActiveFilters
              ? 'Ajusta os filtros ou limpa a pesquisa para ver mais resultados.'
              : 'Adiciona o primeiro jogo manualmente ou importa a tua biblioteca Steam para começar.'
          }
          actionLabel="Adicionar jogo"
          onAction={() => setOpenAddModal(true)}
          secondaryActionLabel={hasActiveFilters ? 'Limpar filtros' : 'Explorar recomendações'}
          onSecondaryAction={() => {
            if (hasActiveFilters) {
              setFilters({ sort: 'added', order: 'desc' });
              return;
            }

            navigate('/discover');
          }}
        />
      )}

      {pagination ? (
        <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-background-card/80 px-5 py-4 text-sm text-text-secondary">
          <span>
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <span>{pagination.totalItems} jogos encontrados</span>
        </div>
      ) : null}

      {openAddModal ? <AddGameModal open onClose={() => setOpenAddModal(false)} /> : null}
    </div>
  );
}