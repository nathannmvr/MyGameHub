import { GameStatus, type DashboardStats } from '@gamehub/shared';

interface StatsCardsProps {
  stats: DashboardStats;
}

const cards = [
  { key: 'totalGames', label: 'Total de jogos', accent: 'text-text-primary' },
  { key: 'playing', label: 'A jogar', accent: 'text-accent-green' },
  { key: 'played', label: 'Concluídos', accent: 'text-accent-gold' },
  { key: 'backlog', label: 'Backlog', accent: 'text-accent-blue' },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  const values = {
    totalGames: stats.totalGames,
    playing: stats.byStatus[GameStatus.PLAYING] ?? 0,
    played: stats.byStatus[GameStatus.PLAYED] ?? 0,
    backlog: stats.byStatus[GameStatus.BACKLOG] ?? 0,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.key} className="rounded-3xl border border-white/10 bg-background-card/80 p-5 shadow-lg shadow-black/10">
          <p className="text-sm text-text-secondary">{card.label}</p>
          <p className={`mt-3 text-3xl font-bold ${card.accent}`}>{values[card.key]}</p>
        </article>
      ))}
    </div>
  );
}
