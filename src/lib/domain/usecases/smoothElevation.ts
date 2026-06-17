import type { TrackPoint } from '../entities/TrackPoint';

export type SmoothingLevel = 'low' | 'medium' | 'high';

/** Centered moving-average window size (odd) per smoothing level. */
const WINDOW: Record<SmoothingLevel, number> = {
  low: 3,
  medium: 7,
  high: 15,
};

/**
 * Smooth a track's elevation with a centered moving average. The window grows
 * with `level`. Null elevations are left untouched and excluded from the
 * average. Non-mutating — returns new points.
 */
export function smoothElevation(points: TrackPoint[], level: SmoothingLevel): TrackPoint[] {
  const window = WINDOW[level];
  const half = Math.floor(window / 2);
  const eles = points.map((p) => p.elevation);

  return points.map((p, i) => {
    if (p.elevation === null) return { ...p, sensors: { ...p.sensors } };
    let sum = 0;
    let count = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j < 0 || j >= eles.length) continue;
      const e = eles[j];
      if (e === null) continue;
      sum += e;
      count += 1;
    }
    return {
      ...p,
      elevation: count > 0 ? sum / count : p.elevation,
      sensors: { ...p.sensors },
    };
  });
}

/**
 * Map a smoothing slider percentage (0–100) to a level.
 * <34 → low, <67 → medium, else high.
 */
export function elevationFixLevelFromPercent(percent: number): SmoothingLevel {
  const p = Math.min(100, Math.max(0, percent));
  if (p < 34) return 'low';
  if (p < 67) return 'medium';
  return 'high';
}
