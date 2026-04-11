import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { getToasts, removeToast, subscribeToasts } from './toast-store';

interface ToastProviderProps {
  children: ReactNode;
}

const variantClasses = {
  success: 'border-accent-green/25 bg-accent-green/10 text-accent-green',
  error: 'border-accent-red/25 bg-accent-red/10 text-accent-red',
  info: 'border-primary/25 bg-primary/10 text-primary-light',
} as const;

function ToastViewport() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  return (
    <div className="fixed bottom-20 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 sm:bottom-6 sm:right-6">
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={cn(
            'animate-slide-up rounded-3xl border px-4 py-4 shadow-2xl shadow-black/30 backdrop-blur-xl',
            variantClasses[toast.variant],
          )}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3 4.5 19.5h15L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text-primary">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-sm leading-6 text-text-secondary">{toast.description}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Fechar notificação"
              className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-text-secondary transition hover:bg-white/10 hover:text-text-primary"
              onClick={() => removeToast(toast.id)}
            >
              x
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <ToastViewport />
    </>
  );
}