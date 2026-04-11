import { cn } from '../../lib/cn';

export interface SpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

export function Spinner({ label, size = 'md', className }: SpinnerProps) {
  return (
    <div className={cn('inline-flex items-center gap-3 text-text-secondary', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'animate-spin rounded-full border-white/20 border-t-primary-light',
          sizeClasses[size],
        )}
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}
