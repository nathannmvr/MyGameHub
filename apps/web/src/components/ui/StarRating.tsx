import { cn } from '../../lib/cn';

export interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} className="h-full w-full">
      <path
        d="m12 17.3-5.5 3 1.1-6.2L3 9.7l6.3-.9L12 3l2.7 5.8 6.3.9-4.6 4.4 1.1 6.2L12 17.3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarRating({ value, max = 5, onChange, disabled = false, className }: StarRatingProps) {
  const clampedValue = Math.max(0, Math.min(value, max));

  return (
    <div className={cn('inline-flex items-center gap-1', className)} role="radiogroup" aria-label={`Rating ${clampedValue} de ${max}`}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const active = starValue <= clampedValue;

        return (
          <button
            key={starValue}
            type="button"
            disabled={disabled}
            aria-label={`${starValue} star${starValue === 1 ? '' : 's'}`}
            aria-pressed={active}
            onClick={() => onChange?.(starValue)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background',
              active ? 'text-accent-gold' : 'text-text-muted hover:text-text-secondary',
              disabled ? 'cursor-default' : 'cursor-pointer',
            )}
          >
            <StarIcon filled={active} />
          </button>
        );
      })}
    </div>
  );
}
