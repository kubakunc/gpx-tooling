import type { TrackPoint } from '../entities/TrackPoint';

export function mergeChronologically(tracks: TrackPoint[][]): TrackPoint[] {
  const all = tracks.flat();
  return all
    .map((p, i) => ({ p, i }))
    .sort((x, y) => {
      const tx = x.p.time ? x.p.time.getTime() : Infinity;
      const ty = y.p.time ? y.p.time.getTime() : Infinity;
      if (tx !== ty) return tx - ty;
      return x.i - y.i; // stable: keep original order on ties / untimed
    })
    .map((e) => e.p);
}
