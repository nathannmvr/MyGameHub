import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../hooks/use-library';
import { GameDetailHero } from '../components/game/GameDetailHero';
import { GameMetadata } from '../components/game/GameMetadata';
import { QuickEditForm } from '../components/game/QuickEditForm';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';

function GameDetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-background-card/80 p-6 shadow-2xl shadow-black/20">
        <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
          <Skeleton className="aspect-[4/5] rounded-[1.5rem] bg-white/8 lg:aspect-auto lg:min-h-[420px]" />
          <div className="space-y-5 p-6 lg:p-8">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-12 w-full max-w-2xl rounded-3xl" />
            <Skeleton className="h-6 w-full max-w-xl rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

export function GameDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const libraryQuery = useLibrary({ pageSize: 100 });

  if (libraryQuery.isLoading) {
    return <GameDetailSkeleton />;
  }

  if (libraryQuery.isError) {
    return <ErrorState title="Não foi possível carregar o detalhe do jogo" description="A consulta da biblioteca falhou. Tenta novamente." onRetry={() => void libraryQuery.refetch()} />;
  }

  const item = libraryQuery.data?.data.find((entry) => entry.id === id);

  if (!item) {
    return <ErrorState title="Jogo não encontrado" description="O item pedido já não existe na biblioteca ou o identificador está incorreto." onRetry={() => navigate('/library')} retryLabel="Voltar à biblioteca" />;
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
