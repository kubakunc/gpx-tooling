import type { TrackPoint } from '../entities/TrackPoint';

export interface StripOptions {
  /** Clear heart-rate / cadence / power extensions (`sensors → {}`). */
  sensors?: boolean;
  /** Clear timestamps (`time → null`). */
  timestamps?: boolean;
  /** Clear elevation (`elevation → null`). */
  elevation?: boolean;
}

/**
 * Return a copy of the track with the chosen fields cleared. Non-mutating;
 * with no opts set, returns an unchanged deep-ish copy (sensors cloned).
 */
export function stripTrack(points: TrackPoint[], opts: StripOptions): TrackPoint[] {
  return points.map((p) => ({
    ...p,
    sensors: opts.sensors ? {} : { ...p.sensors },
    time: opts.timestamps ? null : p.time,
    elevation: opts.elevation ? null : p.elevation
  }));
}
