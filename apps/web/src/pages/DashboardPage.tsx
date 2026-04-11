import { Link } from 'react-router-dom';
import { GameStatus } from '@gamehub/shared';
import { ContinuePlayingCarousel } from '../components/dashboard/ContinuePlayingCarousel';
import { StatsCards } from '../components/dashboard/StatsCards';
import { StatusPieChart } from '../components/dashboard/StatusPieChart';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useDashboard } from '../hooks/use-dashboard';

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <Skeleton className="h-5 w-32 rounded-full" />
          <div className="space-y-4">
            <Skeleton className="h-14 w-full max-w-2xl rounded-3xl" />
            <Skeleton className="h-6 w-full max-w-xl rounded-2xl" />
            <Skeleton className="h-6 w-3/4 max-w-lg rounded-2xl" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-44 rounded-full" />
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-background-card/80 p-6">
          <Skeleton className="h-4 w-28 rounded-full" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </section>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-3xl" />
        ))}
      </div>

      <div className="grid gap-5 rounded-3xl border border-white/10 bg-background-card/80 p-6 lg:grid-cols-[220px_1fr]">
        <Skeleton className="mx-auto h-52 w-52 rounded-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const dashboardQuery = useDashboard();

  if (dashboardQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <ErrorState title="Não foi possível carregar o dashboard" description="Verifica a ligação à API e tenta novamente." onRetry={() => void dashboardQuery.refetch()} />;
  }

  const stats = dashboardQuery.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-text-secondary">
            Dashboard
          </span>
          <div className="space-y-4">
            <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight text-text-primary sm:text-5xl">
              O teu hub pessoal começa no painel de controlo.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
              A biblioteca, o Steam sync e a descoberta já se ligam ao mesmo estado via React Query.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-light" to="/library">
              Abrir biblioteca
            </Link>
            <Link className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-white/10" to="/discover">
              Explorar recomendações
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-background-card/80 p-6 shadow-2xl shadow-black/25">
          <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Sessão atual</p>
          <div className="mt-4 space-y-3 text-sm text-text-secondary">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-text-primary">{stats.totalGames}</span> jogos no total
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-text-primary">{stats.byStatus[GameStatus.PLAYING] ?? 0}</span> atualmente em progresso
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-text-primary">{stats.gamesCompletedThisYear}</span> finalizados este ano
            </div>
          </div>
        </div>
      </section>

      <StatsCards stats={stats} />
      <StatusPieChart stats={stats} />
      <ContinuePlayingCarousel items={stats.continuePlaying} />
    </div>
  );
}