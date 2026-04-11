import { useParams } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner';
import { useLibrary } from '../hooks/use-library';
import { GameDetailHero } from '../components/game/GameDetailHero';
import { GameMetadata } from '../components/game/GameMetadata';
import { QuickEditForm } from '../components/game/QuickEditForm';

export function GameDetailPage() {
  const { id } = useParams();
  const libraryQuery = useLibrary({ pageSize: 100 });

  if (libraryQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="A carregar detalhes do jogo" />
      </div>
    );
  }

  const item = libraryQuery.data?.data.find((entry) => entry.id === id);

  if (!item) {
    return (
      <section className="rounded-3xl border border-white/10 bg-background-card/80 p-8 text-text-secondary">
        Jogo não encontrado na biblioteca.
      </section>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <GameDetailHero item={item} />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <GameMetadata item={item} />
        <QuickEditForm key={item.id} item={item} />
      </div>
    </div>
  );
}
