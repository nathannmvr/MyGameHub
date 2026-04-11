import { Link } from 'react-router-dom';
import { GameStatus } from '@gamehub/shared';
import { ContinuePlayingCarousel } from '../components/dashboard/ContinuePlayingCarousel';
import { StatsCards } from '../components/dashboard/StatsCards';
import { StatusPieChart } from '../components/dashboard/StatusPieChart';
import { Spinner } from '../components/ui/Spinner';
import { useDashboard } from '../hooks/use-dashboard';

export function DashboardPage() {
  const dashboardQuery = useDashboard();

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="A carregar dashboard" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <section className="rounded-3xl border border-white/10 bg-background-card/80 p-8 text-text-secondary">
        Não foi possível carregar as estatísticas do dashboard.
      </section>
    );
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