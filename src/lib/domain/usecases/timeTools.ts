import type { TrackPoint } from '../entities/TrackPoint';
import { haversineMeters } from './geo';
import { shiftPoints } from './mergeEngine';

/** Clone a point (and its sensors) so callers never mutate the input. */
function clone(p: TrackPoint): TrackPoint {
  return { ...p, sensors: { ...p.sensors } };
}

/**
 * Shift all timed points so the FIRST timed point lands on `newStartMs`,
 * preserving every inter-point gap. Untimed points are left untouched. If there
 * are no timed points, returns an unchanged copy. Non-mutating.
 */
export function setStartTime(points: TrackPoint[], newStartMs: number): TrackPoint[] {
  const first = points.find((p) => p.time !== null);
  if (!first) return points.map(clone);
  const delta = newStartMs - first.time!.getTime();
  return points.map((p) => ({
    ...clone(p),
    time: p.time ? new Date(p.time.getTime() + delta) : null
  }));
}

/**
 * Add `seconds` to every timed point (untimed unchanged). Reuses the merge
 * engine's `shiftPoints`. Non-mutating.
 */
export function shiftTimeSeconds(points: TrackPoint[], seconds: number): TrackPoint[] {
  return shiftPoints(points, seconds);
}

export interface RemoveStillOptions {
  /** Movement (m) below which a timed gap counts as a pause. Default 1 m. */
  minMoveMeters?: number;
}

export interface RemoveStillResult {
  points: TrackPoint[];
  /** Total seconds compressed out of the track. */
  removedSeconds: number;
}

/**
 * Find consecutive timed points whose movement is below `minMoveMeters` and
 * compress that gap's duration out of the track: the pause duration is
 * subtracted from that point and all subsequent timestamps. Geometry is
 * unchanged. Non-mutating; never throws.
 */
export function removeStillTime(
  points: TrackPoint[],
  opts: RemoveStillOptions = {}
): RemoveStillResult {
  const minMoveMeters = opts.minMoveMeters ?? 1;
  const out = points.map(clone);
  if (out.length <= 1) return { points: out, removedSeconds: 0 };

  let removedMs = 0;
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const cur = out[i];
    // Running offset already applied to prev; carry it onto cur first.
    if (cur.time) cur.time = new Date(cur.time.getTime() - removedMs);
    if (prev.time && cur.time) {
      const dist = haversineMeters(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
      const dtMs = cur.time.getTime() - prev.time.getTime();
      if (dist < minMoveMeters && dtMs > 0) {
        // Collapse this pause: pull cur back onto prev and accumulate.
        cur.time = new Date(prev.time.getTime());
        removedMs += dtMs;
      }
    }
  }
  return { points: out, removedSeconds: Math.round(removedMs / 1000) };
}
