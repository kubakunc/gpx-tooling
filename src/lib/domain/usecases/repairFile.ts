import type { TrackPoint } from '../entities/TrackPoint';
import { haversineMeters } from './geo';
import { dedupePoints } from './mergeEngine';
import { repairElevation } from './repairElevation';

export type RepairStrength = 'conservative' | 'balanced' | 'aggressive';

/** Max plausible implied speed (m/s) before a timed point is a teleport. */
export const MAX_SPEED_MPS: Record<RepairStrength, number> = {
  conservative: 83, // ~300 km/h
  balanced: 42, // ~150 km/h
  aggressive: 28 // ~100 km/h
};

/** Max plausible neighbour distance (m) for UNTIMED outlier detection. */
export const MAX_DIST_METERS: Record<RepairStrength, number> = {
  conservative: 1000,
  balanced: 300,
  aggressive: 150
};

export interface RepairReport {
  /** Invalid coordinates dropped (NaN/out-of-range/exact 0,0). */
  invalid: number;
  /** GPS teleports / distance outliers dropped. */
  spikes: number;
  /** Coincident duplicate points removed. */
  duplicates: number;
  /** Points whose elevation was corrected. */
  elevationFixed: number;
}

export interface RepairResult {
  points: TrackPoint[];
  report: RepairReport;
}

function clone(p: TrackPoint): TrackPoint {
  return { ...p, sensors: { ...p.sensors } };
}

function isValid(p: TrackPoint): boolean {
  if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return false;
  if (Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180) return false;
  if (p.latitude === 0 && p.longitude === 0) return false;
  return true;
}

/**
 * Clean a track: drop invalid points, sort by time, dedupe, remove GPS spikes /
 * teleports, repair elevation (balanced+aggressive), and (aggressive) lightly
 * smooth lat/lon jitter. Non-mutating; never throws.
 */
export function repairTrack(points: TrackPoint[], opts: { strength: RepairStrength }): RepairResult {
  const { strength } = opts;
  const report: RepairReport = { invalid: 0, spikes: 0, duplicates: 0, elevationFixed: 0 };

  // 1. Drop invalid points.
  let work = points.map(clone).filter((p) => {
    if (isValid(p)) return true;
    report.invalid++;
    return false;
  });

  // 2. Sort timed points ascending (untimed keep their relative order via stable sort).
  work = [...work].sort((a, b) => {
    if (a.time && b.time) return a.time.getTime() - b.time.getTime();
    return 0;
  });

  // 3. Dedupe coincident points.
  const deduped = dedupePoints(work);
  report.duplicates = deduped.removed;
  work = deduped.points;

  // 4. Remove GPS spikes / teleports (speed when timed, distance when untimed).
  const maxSpeed = MAX_SPEED_MPS[strength];
  const maxDist = MAX_DIST_METERS[strength];
  const kept: TrackPoint[] = [];
  for (const cur of work) {
    const prev = kept[kept.length - 1];
    if (!prev) {
      kept.push(cur);
      continue;
    }
    const dist = haversineMeters(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
    let outlier = false;
    if (prev.time && cur.time) {
      const dtS = (cur.time.getTime() - prev.time.getTime()) / 1000;
      if (dtS > 0 && dist / dtS > maxSpeed) outlier = true;
    } else if (dist > maxDist) {
      outlier = true;
    }
    if (outlier) {
      report.spikes++;
      continue; // drop the spike; keep comparing future points against `prev`.
    }
    kept.push(cur);
  }
  work = kept;

  // 5. Elevation spike repair (balanced + aggressive only).
  if (strength !== 'conservative') {
    const repaired = repairElevation(work);
    for (let i = 0; i < repaired.length; i++) {
      if (repaired[i].elevation !== work[i].elevation) report.elevationFixed++;
    }
    work = repaired;
  }

  // 6. Aggressive: light centered 3-point moving-average of lat/lon (endpoints kept).
  if (strength === 'aggressive' && work.length >= 3) {
    const src = work;
    const smoothed = src.map(clone);
    for (let i = 1; i < src.length - 1; i++) {
      smoothed[i].latitude = (src[i - 1].latitude + src[i].latitude + src[i + 1].latitude) / 3;
      smoothed[i].longitude = (src[i - 1].longitude + src[i].longitude + src[i + 1].longitude) / 3;
    }
    work = smoothed;
  }

  return { points: work, report };
}
