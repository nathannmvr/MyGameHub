import { cn } from '../../lib/cn';
import { Button } from './Button';

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({ title, description, onRetry, retryLabel = 'Tentar novamente', className }: ErrorStateProps) {
  return (
    <section className={cn('rounded-[2rem] border border-accent-red/25 bg-accent-red/10 p-8 text-center', className)}>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-red/20 bg-accent-red/10 text-accent-red">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 8v4m0 4h.01M10.3 4.7h3.4L21 12l-7.3 7.3h-3.4L3 12 10.3 4.7Z"
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
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
}