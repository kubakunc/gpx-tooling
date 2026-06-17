import type { TrackPoint } from '../entities/TrackPoint';

/** Max RDP epsilon (meters) at 0% accuracy. */
export const MAX_EPS = 50;

/**
 * Map an accuracy slider percentage (0–100) to an RDP epsilon in meters.
 * Higher accuracy% → smaller epsilon → more points kept.
 *   epsilon = round( (1 - percent/100) * MAX_EPS )
 */
export function percentToEpsilon(percent: number): number {
  const p = Math.min(100, Math.max(0, percent));
  return Math.round((1 - p / 100) * MAX_EPS);
}

/**
 * Outcome-framed label for a "detail kept" slider percentage (0–100).
 * Thresholds: <34 → 'Low', <67 → 'Medium', else → 'High'.
 * (Input is clamped to [0,100] first.)
 */
export function simplificationLabel(percent: number): 'Low' | 'Medium' | 'High' {
  const p = Math.min(100, Math.max(0, percent));
  if (p < 34) return 'Low';
  if (p < 67) return 'Medium';
  return 'High';
}

/**
 * Build an SVG polyline `points` attribute from track elevations, normalised
 * into a [0,width] × [0,height] box (y inverted so higher elevation is up).
 * Returns '' for tracks with no usable elevation.
 */
export function elevationProfilePoints(
  points: TrackPoint[],
  width: number,
  height: number
): string {
  const eles = points.map((p) => p.elevation).filter((e): e is number => e !== null);
  if (eles.length < 2) return '';
  const min = Math.min(...eles);
  const max = Math.max(...eles);
  const span = max - min || 1;
  const stepX = width / (eles.length - 1);
  return eles
    .map((e, i) => {
      const x = i * stepX;
      const y = height - ((e - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
