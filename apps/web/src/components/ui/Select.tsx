import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, id, label, error, helperText, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const message = error ?? helperText;

  return (
    <label className="flex w-full flex-col gap-2" htmlFor={selectId}>
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'h-11 rounded-2xl border bg-white/5 px-4 text-sm text-text-primary transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20',
          error ? 'border-accent-red/70' : 'border-white/10',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {message ? (
        <span className={cn('text-xs', error ? 'text-accent-red' : 'text-text-secondary')}>
          {message}
        </span>
      ) : null}
    </label>
  );
});
