import { writable } from 'svelte/store';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

export interface ShowToastOptions {
  /** Auto-dismiss after `durationMs` (default true). Disable in tests. */
  autoDismiss?: boolean;
  /** Milliseconds before auto-dismiss (default 3500). */
  durationMs?: number;
}

export const toasts = writable<Toast[]>([]);

// Module-scoped counter — no Math.random for ids.
let counter = 0;

const DEFAULT_DURATION = 3500;

export function showToast(
  message: string,
  kind: ToastKind = 'info',
  options: ShowToastOptions = {}
): number {
  const { autoDismiss = true, durationMs = DEFAULT_DURATION } = options;
  const id = ++counter;
  toasts.update((list) => [...list, { id, message, kind }]);
  if (autoDismiss) {
    setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
}

export function dismissToast(id: number): void {
  toasts.update((list) => list.filter((t) => t.id !== id));
}

/** Test-only reset of the store and id counter. */
export function __resetToasts(): void {
  toasts.set([]);
  counter = 0;
}
