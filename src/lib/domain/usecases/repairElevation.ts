import type { TrackPoint } from '../entities/TrackPoint';

export interface RepairOptions { maxJumpMeters?: number; minSeconds?: number; }

export function repairElevation(points: TrackPoint[], opts: RepairOptions = {}): TrackPoint[] {
  const maxJump = opts.maxJumpMeters ?? 100;
  const minSeconds = opts.minSeconds ?? 1;
  const out = points.map((p) => ({ ...p, sensors: { ...p.sensors } }));
  for (let i = 1; i < out.length - 1; i++) {
    const prev = out[i - 1], cur = out[i], next = out[i + 1];
    if (prev.elevation === null || cur.elevation === null || next.elevation === null) continue;
    const jump = Math.abs(cur.elevation - prev.elevation);
    let suddenInTime = false;
    if (cur.time && prev.time) {
      suddenInTime = (cur.time.getTime() - prev.time.getTime()) / 1000 < minSeconds;
    }
    const isolatedOutlier =
      Math.abs(cur.elevation - prev.elevation) > maxJump &&
      Math.abs(cur.elevation - next.elevation) > maxJump &&
      Math.sign(cur.elevation - prev.elevation) === Math.sign(cur.elevation - next.elevation);
    if (jump > maxJump && (suddenInTime || isolatedOutlier)) {
      cur.elevation = (prev.elevation + next.elevation) / 2;
    }
  }
  return out;
}
