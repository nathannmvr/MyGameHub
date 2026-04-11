import { GameStatus, type DashboardStats } from '@gamehub/shared';

interface StatusPieChartProps {
  stats: DashboardStats;
}

const chartColors: Record<GameStatus, string> = {
  [GameStatus.WISHLIST]: '#FF9100',
  [GameStatus.BACKLOG]: '#448AFF',
  [GameStatus.PLAYING]: '#00E676',
  [GameStatus.PLAYED]: '#FFD700',
  [GameStatus.DROPPED]: '#FF5252',
};

const statusLabels: Record<GameStatus, string> = {
  [GameStatus.WISHLIST]: 'Wishlist',
  [GameStatus.BACKLOG]: 'Backlog',
  [GameStatus.PLAYING]: 'Playing',
  [GameStatus.PLAYED]: 'Played',
  [GameStatus.DROPPED]: 'Dropped',
};

export function StatusPieChart({ stats }: StatusPieChartProps) {
  const total = Object.values(stats.byStatus).reduce((sum, value) => sum + value, 0);
  const entries = Object.entries(stats.byStatus) as Array<[GameStatus, number]>;

  const gradient = entries
    .filter(([, count]) => count > 0)
    .reduce<{ segments: string[]; cursor: number }>(
      (acc, [status, count]) => {
        const start = acc.cursor;
        const portion = total === 0 ? 0 : (count / total) * 100;
        const end = start + portion;
        acc.segments.push(`${chartColors[status]} ${start}% ${end}%`);
        acc.cursor = end;
        return acc;
      },
      { segments: [], cursor: 0 },
    ).segments.join(', ');

  return (
    <section className="grid gap-5 rounded-3xl border border-white/10 bg-background-card/80 p-6 lg:grid-cols-[220px_1fr]">
      <div className="flex items-center justify-center">
        <div
          className="flex h-52 w-52 items-center justify-center rounded-full border border-white/10 shadow-inner shadow-black/40"
          style={{
            background: total > 0 ? `conic-gradient(${gradient})` : 'radial-gradient(circle, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
          }}
        >
          <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-white/10 bg-background-card text-center">
            <span className="text-xs uppercase tracking-[0.28em] text-text-secondary">Total</span>
            <span className="mt-2 text-3xl font-bold text-text-primary">{total}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-text-secondary">Distribuição por status</p>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">Visão rápida do estado da biblioteca</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map(([status, count]) => (
            <div key={status} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text-primary">{statusLabels[status]}</span>
                <span className="text-sm text-text-secondary">{count}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/5">
                <div className="h-2 rounded-full" style={{ width: `${total === 0 ? 0 : (count / total) * 100}%`, backgroundColor: chartColors[status] }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
