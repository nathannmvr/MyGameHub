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
  const messageId = `${selectId}-message`;
  const message = error ?? helperText;
  const hasMessage = Boolean(message);

  return (
    <label className="flex w-full flex-col gap-2" htmlFor={selectId}>
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={hasMessage ? messageId : undefined}
          className={cn(
            'peer h-12 w-full appearance-none rounded-[1.35rem] border bg-linear-to-b from-white/8 to-white/3 px-4 pr-11 text-sm text-text-primary shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] outline-none transition duration-200 placeholder:text-text-muted focus:border-primary/35 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0',
            '[&>option]:text-white [&>option]:bg-slate-900 [&>optgroup]:text-white [&>optgroup]:bg-slate-900',
            error ? 'border-accent-red/70 focus:border-accent-red/80 focus:ring-accent-red/20' : 'border-white/12 hover:border-white/20',
            props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-secondary transition peer-focus:text-text-primary"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {message ? (
        <span id={messageId} className={cn('text-xs', error ? 'text-accent-red' : 'text-text-secondary')}>
          {message}
        </span>
      ) : null}
    </label>
  );
});
