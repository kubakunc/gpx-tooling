import { writable } from 'svelte/store';

export interface EditSession {
  fileId: string | null;
  startRatio: number;
  endRatio: number;
  epsilon: number;
}

export const DEFAULT_EDIT_SESSION: EditSession = {
  fileId: null,
  startRatio: 0,
  endRatio: 1,
  epsilon: 10
};

export const editSession = writable<EditSession>({ ...DEFAULT_EDIT_SESSION });

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

// Minimum gap so start < end always holds after clamping.
const MIN_GAP = 1e-6;

export function setFileId(fileId: string | null): void {
  editSession.update((s) => ({ ...s, fileId }));
}

export function setStartRatio(ratio: number): void {
  editSession.update((s) => {
    const start = Math.min(clamp01(ratio), s.endRatio - MIN_GAP);
    return { ...s, startRatio: Math.max(0, start) };
  });
}

export function setEndRatio(ratio: number): void {
  editSession.update((s) => {
    const end = Math.max(clamp01(ratio), s.startRatio + MIN_GAP);
    return { ...s, endRatio: Math.min(1, end) };
  });
}

export function setEpsilon(epsilon: number): void {
  editSession.update((s) => ({ ...s, epsilon: Math.max(0, epsilon) }));
}

export function resetEditSession(): void {
  editSession.set({ ...DEFAULT_EDIT_SESSION });
}
