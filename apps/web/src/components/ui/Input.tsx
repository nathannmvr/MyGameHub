import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, id, label, error, helperText, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const message = error ?? helperText;

  return (
    <label className="flex w-full flex-col gap-2" htmlFor={inputId}>
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-11 rounded-2xl border bg-white/5 px-4 text-sm text-text-primary placeholder:text-text-muted transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20',
          error ? 'border-accent-red/70' : 'border-white/10',
          className,
        )}
        {...props}
      />
      {message ? (
        <span className={cn('text-xs', error ? 'text-accent-red' : 'text-text-secondary')}>
          {message}
        </span>
      ) : null}
    </label>
  );
});
