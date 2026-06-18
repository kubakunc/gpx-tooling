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
