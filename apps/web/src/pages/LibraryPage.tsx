import { useMemo, useState } from 'react';
import { useLibrary } from '../hooks/use-library';
import { usePlatforms } from '../hooks/use-platforms';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { LibraryFilters, type LibraryFiltersValue } from '../components/library/LibraryFilters';
import { GameGrid } from '../components/library/GameGrid';
import { GameCard } from '../components/library/GameCard';
import { AddGameModal } from '../components/library/AddGameModal';

export function LibraryPage() {
  const [filters, setFilters] = useState<LibraryFiltersValue>({ sort: 'added', order: 'desc' });
  const [openAddModal, setOpenAddModal] = useState(false);
  const libraryQuery = useLibrary(filters);
  const platformsQuery = usePlatforms();

  const items = useMemo(() => libraryQuery.data?.data ?? [], [libraryQuery.data]);
  const pagination = libraryQuery.data?.pagination;

  if (libraryQuery.isLoading || platformsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="A carregar biblioteca" />
      </div>
    );
  }

  if (libraryQuery.isError || platformsQuery.isError) {
    return (
      <section className="rounded-3xl border border-white/10 bg-background-card/80 p-8 text-text-secondary">
        Não foi possível carregar a biblioteca.
      </section>
    );
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