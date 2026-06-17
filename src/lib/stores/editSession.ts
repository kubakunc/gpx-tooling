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
    // Move only the start bound, keeping at least MIN_GAP below end.
    const start = Math.max(0, Math.min(clamp01(ratio), s.endRatio - MIN_GAP));
    // If end sits so low that the gap can't fit, nudge end up (capped at 1).
    const end = Math.min(1, Math.max(s.endRatio, start + MIN_GAP));
    return { ...s, startRatio: start, endRatio: end };
  });
}

export function setEndRatio(ratio: number): void {
  editSession.update((s) => {
    // Move only the end bound, keeping at least MIN_GAP above start.
    const end = Math.min(1, Math.max(clamp01(ratio), s.startRatio + MIN_GAP));
    // If start sits so high that the gap can't fit, nudge start down (>= 0).
    const start = Math.max(0, Math.min(s.startRatio, end - MIN_GAP));
    return { ...s, startRatio: start, endRatio: end };
  });
}

export function setEpsilon(epsilon: number): void {
  editSession.update((s) => ({ ...s, epsilon: Math.max(0, epsilon) }));
}

export function resetEditSession(): void {
  editSession.set({ ...DEFAULT_EDIT_SESSION });
}
