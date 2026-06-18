import type { TrackPoint } from '../entities/TrackPoint';
import { haversineMeters } from './geo';
import { elevationGainMeters } from './stats';

export type MergeMode = 'smart' | 'sequential';

export interface MergeOptions {
  mode: MergeMode;
  gapMeters?: number; // default 100
  forceContinuous?: boolean; // default false
  maxSpeedMps?: number; // default 42 (~151 km/h)
  timeGapSeconds?: number; // optional; split on long pauses
  timeShiftSecondsByIndex?: Record<number, number>;
}

export interface MergeIssue {
  kind: 'overlap' | 'gap' | 'teleport' | 'duplicate' | 'unordered';
  message: string;
  fileIndex?: number;
  meters?: number;
  seconds?: number;
  speedKmh?: number;
  count?: number;
}

export interface MergeStats {
  distanceM: number;
  gainM: number;
  durationS: number;
  points: number;
  segmentCount: number;
}

export interface MergeResult {
  segments: TrackPoint[][];
  issues: MergeIssue[];
  stats: MergeStats;
}

export function shiftPoints(points: TrackPoint[], seconds: number): TrackPoint[] {
  if (!seconds) return points.map((p) => ({ ...p, sensors: { ...p.sensors } }));
  return points.map((p) => ({
    ...p,
    sensors: { ...p.sensors },
    time: p.time ? new Date(p.time.getTime() + seconds * 1000) : null
  }));
}

export function fileStartMs(points: TrackPoint[]): number | null {
  let min: number | null = null;
  for (const p of points) {
    if (p.time) {
      const t = p.time.getTime();
      if (min === null || t < min) min = t;
    }
  }
  return min;
}

export function fileEndMs(points: TrackPoint[]): number | null {
  let max: number | null = null;
  for (const p of points) {
    if (p.time) {
      const t = p.time.getTime();
      if (max === null || t > max) max = t;
    }
  }
  return max;
}

function fmtDur(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`;
}

/** Flag files (in the given order) whose start precedes the running max end. */
export function detectTimeOverlaps(files: TrackPoint[][]): MergeIssue[] {
  const issues: MergeIssue[] = [];
  let runningEnd: number | null = null;
  files.forEach((pts, idx) => {
    const start = fileStartMs(pts);
    const end = fileEndMs(pts);
    if (start !== null && runningEnd !== null && start < runningEnd) {
      const seconds = Math.round((runningEnd - start) / 1000);
      issues.push({
        kind: 'overlap',
        fileIndex: idx,
        seconds,
        message: `File ${idx + 1} overlaps the previous by ${fmtDur(seconds)} — shift it to fix.`
      });
    }
    if (end !== null) runningEnd = runningEnd === null ? end : Math.max(runningEnd, end);
  });
  return issues;
}

export function dedupePoints(points: TrackPoint[]): { points: TrackPoint[]; removed: number } {
  if (points.length === 0) return { points: [], removed: 0 };
  const out: TrackPoint[] = [points[0]];
  let removed = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    const cur = points[i];
    const sameTime =
      prev.time !== null && cur.time !== null && prev.time.getTime() === cur.time.getTime();
    const dist = haversineMeters(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
    const dt =
      prev.time && cur.time ? Math.abs(cur.time.getTime() - prev.time.getTime()) / 1000 : null;
    const coincident = dist < 0.5 && (dt === null || dt < 1);
    if (sameTime || coincident) {
      removed++;
      continue;
    }
    out.push(cur);
  }
  return { points: out, removed };
}

export function splitIntoSegments(
  points: TrackPoint[],
  opts: {
    gapMeters?: number;
    maxSpeedMps?: number;
    timeGapSeconds?: number;
    forceContinuous?: boolean;
  }
): { segments: TrackPoint[][]; issues: MergeIssue[] } {
  if (points.length === 0) return { segments: [], issues: [] };
  if (opts.forceContinuous) return { segments: [points], issues: [] };
  const gapMeters = opts.gapMeters ?? 100;
  const maxSpeedMps = opts.maxSpeedMps ?? 42;
  const issues: MergeIssue[] = [];
  const segments: TrackPoint[][] = [];
  let cur: TrackPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const p = points[i];
    const dist = haversineMeters(prev.latitude, prev.longitude, p.latitude, p.longitude);
    const dt = prev.time && p.time ? (p.time.getTime() - prev.time.getTime()) / 1000 : null;
    let split: MergeIssue | null = null;
    if (dist > gapMeters) {
      split = {
        kind: 'gap',
        meters: Math.round(dist),
        message: `Gap of ${(dist / 1000).toFixed(2)} km — split into a new segment.`
      };
    } else if (dt !== null && dt > 0 && dist / dt > maxSpeedMps) {
      const speedKmh = Math.round((dist / dt) * 3.6);
      split = {
        kind: 'teleport',
        speedKmh,
        message: `Implausible speed ${speedKmh} km/h — split into a new segment.`
      };
    } else if (opts.timeGapSeconds && dt !== null && dt > opts.timeGapSeconds) {
      split = {
        kind: 'gap',
        seconds: Math.round(dt),
        message: `Pause of ${Math.round(dt / 60)} min — split into a new segment.`
      };
    }
    if (split) {
      segments.push(cur);
      cur = [p];
      issues.push(split);
    } else cur.push(p);
  }
  segments.push(cur);
  return { segments, issues };
}
