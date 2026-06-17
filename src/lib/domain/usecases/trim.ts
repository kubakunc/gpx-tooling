import type { TrackPoint } from '../entities/TrackPoint';

export function trimGpx(points: TrackPoint[], startRatio: number, endRatio: number): TrackPoint[] {
  if (startRatio < 0 || endRatio > 1 || startRatio >= endRatio) {
    throw new RangeError(`Invalid trim ratios: ${startRatio}..${endRatio}`);
  }
  if (points.length === 0) return [];
  const n = points.length;
  const start = Math.round(startRatio * n);
  const end = Math.round(endRatio * n);
  return points.slice(start, end);
}
