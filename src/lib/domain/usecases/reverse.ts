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
 *  - If EVERY point is timed, first sort the points by time ascending (the input
 *    may not be time-ordered), keep the earliest timestamp `t0`, then rebuild
 *    forward timestamps from the reversed inter-point gaps. The result is always
 *    strictly forward-moving with the same total duration as the input.
 *  - If ANY point is untimed, return geometry reversed with all `time = null`.
 *
 * Non-mutating; `<= 1` point returns a copy.
 */
export function reverseTrack(points: TrackPoint[]): TrackPoint[] {
  if (points.length <= 1) return points.map(clone);

  const allTimed = points.every((p) => p.time !== null);

  if (!allTimed) {
    const reversed = points.map(clone).reverse();
    for (const p of reversed) p.time = null;
    return reversed;
  }

  // The input may not be time-sorted; sort ascending before reversing so the
  // rebuilt timestamps can't run backwards.
  const sorted = points.map(clone).sort((a, b) => a.time!.getTime() - b.time!.getTime());

  // Forward gaps between time-sorted consecutive points: gaps[i] = t[i+1]-t[i].
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i].time!.getTime() - sorted[i - 1].time!.getTime());
  }

  // Rebuild from the earliest timestamp t0, walking the gaps in reverse order.
  const reversed = sorted.reverse();
  const t0 = points.reduce((min, p) => Math.min(min, p.time!.getTime()), Infinity);
  let acc = t0;
  reversed[0].time = new Date(t0);
  for (let i = 1; i < reversed.length; i++) {
    acc += gaps[gaps.length - i];
    reversed[i].time = new Date(acc);
  }
  return reversed;
}
