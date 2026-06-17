import { describe, it, expect } from 'vitest';
import { simplifyRdp } from './simplify';
import { compareTracks, extractSeries } from './compare';
import type { TrackPoint } from '../entities/TrackPoint';

/** Build a noisy track of `n` points so the engine can't trivially short-circuit. */
function bigTrack(n: number): TrackPoint[] {
  const pts: TrackPoint[] = [];
  for (let i = 0; i < n; i++) {
    pts.push({
      latitude: 49 + Math.sin(i / 50) * 0.01 + (i % 7) * 1e-5,
      longitude: 19 + i * 1e-5,
      elevation: 800 + Math.sin(i / 30) * 20,
      time: new Date(i * 1000),
      sensors: { power: 200 + (i % 50), hr: 140 + (i % 20) }
    });
  }
  return pts;
}

describe('robustness: large tracks', () => {
  it('simplifies 100k points without hanging or overflowing the stack', () => {
    const pts = bigTrack(100_000);
    const out = simplifyRdp(pts, 5);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.length).toBeLessThanOrEqual(pts.length);
    // First and last are always kept.
    expect(out[0]).toBe(pts[0]);
    expect(out[out.length - 1]).toBe(pts[pts.length - 1]);
  });

  it('compares 100k-point tracks and returns finite stats', () => {
    const a = bigTrack(100_000);
    const b = bigTrack(100_000);
    const r = compareTracks(a, b, 'power', 0);
    expect(r.seriesA.length).toBe(100_000);
    expect(Number.isFinite(r.avgA ?? NaN)).toBe(true);
    expect(r.diffPercent).toBeCloseTo(0);
  });
});

describe('robustness: missing data', () => {
  it('extractSeries returns empty when the metric is absent', () => {
    const pts: TrackPoint[] = [
      { latitude: 0, longitude: 0, elevation: null, time: new Date(0), sensors: {} }
    ];
    expect(extractSeries(pts, 'power')).toEqual([]);
  });

  it('compareTracks is null-safe when neither track has the metric', () => {
    const pts: TrackPoint[] = [
      { latitude: 0, longitude: 0, elevation: null, time: new Date(0), sensors: { hr: 150 } }
    ];
    const r = compareTracks(pts, pts, 'power', 0);
    expect(r.avgA).toBeNull();
    expect(r.avgB).toBeNull();
    expect(r.diffPercent).toBeNull();
  });

  it('simplifyRdp handles a single-point track', () => {
    const pts: TrackPoint[] = [
      { latitude: 0, longitude: 0, elevation: null, time: null, sensors: {} }
    ];
    expect(simplifyRdp(pts, 10)).toHaveLength(1);
  });

  it('simplifyRdp handles an empty track', () => {
    expect(simplifyRdp([], 10)).toEqual([]);
  });
});
