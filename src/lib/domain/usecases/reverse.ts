import type { TrackPoint } from '../entities/TrackPoint';

/** Clone a point (and its sensors) so callers never mutate the input. */
function clone(p: TrackPoint): TrackPoint {
  return { ...p, sensors: { ...p.sensors } };
}

/**
 * Reverse a track's direction.
 *
 * Geometry (lat/lon), elevation and sensors travel with their points — the
 * point order is simply reversed.
 *
 * Timestamps: a track can't keep DECREASING times after a flip, so:
 *  - If EVERY point is timed, keep the original first timestamp `t0` and rebuild
 *    forward timestamps from the reversed inter-point gaps (still increasing,
 *    same total duration).
 *  - If ANY point is untimed, return geometry reversed with all `time = null`.
 *
 * Non-mutating; `<= 1` point returns a copy.
 */
export function reverseTrack(points: TrackPoint[]): TrackPoint[] {
  if (points.length <= 1) return points.map(clone);

  const reversed = points.map(clone).reverse();
  const allTimed = points.every((p) => p.time !== null);

  if (!allTimed) {
    for (const p of reversed) p.time = null;
    return reversed;
  }

  // Forward gaps between ORIGINAL consecutive points: gaps[i] = t[i+1]-t[i].
  const gaps: number[] = [];
  for (let i = 1; i < points.length; i++) {
    gaps.push(points[i].time!.getTime() - points[i - 1].time!.getTime());
  }
  // Rebuild from the original t0, walking the gaps in reverse order.
  const t0 = points[0].time!.getTime();
  let acc = t0;
  reversed[0].time = new Date(t0);
  for (let i = 1; i < reversed.length; i++) {
    acc += gaps[gaps.length - i];
    reversed[i].time = new Date(acc);
  }
  return reversed;
}
