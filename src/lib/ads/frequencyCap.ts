/** Three minutes, in milliseconds. */
export const DEFAULT_CAP_MS = 180_000;

/**
 * Pure frequency-cap predicate for interstitials.
 * Returns true when an interstitial may be shown: either it has never been
 * shown (`lastShownMs === null`) or at least `capMs` has elapsed since.
 */
export function canShow(
  lastShownMs: number | null,
  nowMs: number,
  capMs: number = DEFAULT_CAP_MS
): boolean {
  if (lastShownMs === null) return true;
  return nowMs - lastShownMs >= capMs;
}
