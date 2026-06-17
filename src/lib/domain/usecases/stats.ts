import type { TrackPoint } from '../entities/TrackPoint';
import { haversineMeters } from './geo';

export function totalDistanceMeters(points: TrackPoint[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    sum += haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
  }
  return sum;
}

export function elevationGainMeters(points: TrackPoint[]): number {
  let gain = 0;
  let prev: number | null = null;
  for (const p of points) {
    if (p.elevation === null) continue;
    if (prev !== null && p.elevation > prev) gain += p.elevation - prev;
    prev = p.elevation;
  }
  return gain;
}

export function durationSeconds(points: TrackPoint[]): number {
  const timed = points.filter((p) => p.time !== null);
  if (timed.length < 2) return 0;
  const first = timed[0].time!.getTime();
  const last = timed[timed.length - 1].time!.getTime();
  return Math.round((last - first) / 1000);
}
