import { cn } from '../../lib/cn';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        'rounded-[2rem] border border-dashed border-white/10 bg-background-card/70 p-8 text-center shadow-lg shadow-black/10',
        className,
      )}
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary-light">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 7.5h10A2.5 2.5 0 0 1 19.5 10v4A2.5 2.5 0 0 1 17 16.5H7A2.5 2.5 0 0 1 4.5 14v-4A2.5 2.5 0 0 1 7 7.5Zm2.5 2.75v3.5M9.5 12h5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-2xl font-semibold text-text-primary">{title}</h3>
          <p className="text-sm leading-6 text-text-secondary">{description}</p>
        </div>
        {(actionLabel || secondaryActionLabel) && (
          <div className="flex flex-wrap justify-center gap-3">
            {secondaryActionLabel ? (
              <Button variant="secondary" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            ) : null}
            {actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null}
          </div>
        )}
      </div>
    </section>
  );
}