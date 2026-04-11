export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

type ToastInput = Omit<ToastItem, 'id'>;

const listeners = new Set<() => void>();
let toasts: ToastItem[] = [];

function emit() {
  listeners.forEach((listener) => listener());
}

function createToastId() {
  return globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getToasts() {
  return toasts;
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function pushToast(input: ToastInput) {
  const nextToast: ToastItem = {
    id: createToastId(),
    ...input,
  };

  toasts = [...toasts, nextToast].slice(-4);
  emit();

  globalThis.setTimeout(() => {
    removeToast(nextToast.id);
  }, 4500);
}

export function removeToast(toastId: string) {
  const nextToasts = toasts.filter((toast) => toast.id !== toastId);

  if (nextToasts.length === toasts.length) {
    return;
  }

  toasts = nextToasts;
  emit();
}

export function clearToasts() {
  toasts = [];
  emit();
}