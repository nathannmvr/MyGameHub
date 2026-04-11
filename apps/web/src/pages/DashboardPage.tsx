import { ContinuePlayingCarousel } from '../components/dashboard/ContinuePlayingCarousel';
import { StatsCards } from '../components/dashboard/StatsCards';
import { StatusPieChart } from '../components/dashboard/StatusPieChart';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useDashboard } from '../hooks/use-dashboard';

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
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
    return <ErrorState title="Não foi possível carregar o dashboard" description="Verifique a conexão com a API e tente novamente." onRetry={() => void dashboardQuery.refetch()} />;
  }

  const stats = dashboardQuery.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <StatsCards stats={stats} />
      <StatusPieChart stats={stats} />
      <ContinuePlayingCarousel items={stats.continuePlaying} />
    </div>
  );
}