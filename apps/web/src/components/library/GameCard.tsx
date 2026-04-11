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
  const content = (
    <article className="group flex overflow-hidden rounded-[1.75rem] border border-white/10 bg-background-card/80 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-primary/15 md:block">
      <div className="w-28 shrink-0 bg-background-hover sm:w-32 md:w-full md:aspect-[4/5]">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-3 p-4 md:min-w-0">
        <div className="space-y-1">
          {statusLabel ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-text-secondary">{statusLabel}</p>
          ) : null}
          <h3 className="line-clamp-2 text-lg font-semibold text-text-primary">{title}</h3>
          {subtitle ? <p className="text-sm text-text-secondary">{subtitle}</p> : null}
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

  if (href && !actionLabel) {
    return (
      <Link to={href} className="block focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background">
        {content}
      </Link>
    );
  }

  return (
    content
  );
}
