import { Link } from 'react-router-dom';

export interface GameCardProps {
  id: string;
  title: string;
  coverUrl?: string | null;
  statusLabel?: string;
  subtitle?: string;
  metadata?: string;
  actionLabel?: string;
  href?: string;
  onAction?: () => void;
}

export function GameCard({
  id,
  title,
  coverUrl,
  statusLabel,
  subtitle,
  metadata,
  actionLabel,
  href,
  onAction,
}: GameCardProps) {
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-background-card/80 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:shadow-primary/10">
      <div className="aspect-[4/5] bg-background-hover">
        {coverUrl ? <img src={coverUrl} alt={title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : null}
      </div>
      <div className="space-y-3 p-4">
        <div>
          {statusLabel ? <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">{statusLabel}</p> : null}
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-text-primary">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
        </div>
        {metadata ? <p className="text-sm text-text-muted">{metadata}</p> : null}
        {actionLabel ? (
          href ? (
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white/10"
              to={href}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white/10"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          )
        ) : null}
        <span className="sr-only">{id}</span>
      </div>
    </article>
  );
}
