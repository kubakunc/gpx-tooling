import { describe, it, expect } from 'vitest';
import { trimGpx } from './trim';
import type { TrackPoint } from '../entities/TrackPoint';

const pts = (n: number): TrackPoint[] =>
  Array.from({ length: n }, (_, i) => ({ latitude: i, longitude: 0, elevation: null, time: null, sensors: {} }));

describe('trimGpx', () => {
  it('maps ratios to a half-open index range', () => {
    const r = trimGpx(pts(10), 0.2, 0.8);
    expect(r[0].latitude).toBe(2);
    expect(r[r.length - 1].latitude).toBe(7);
    expect(r).toHaveLength(6);
  });
  it('returns the whole track for 0..1', () => {
    expect(trimGpx(pts(5), 0, 1)).toHaveLength(5);
  });
  it('throws when start >= end or ratios out of [0,1]', () => {
    expect(() => trimGpx(pts(5), 0.6, 0.4)).toThrow();
    expect(() => trimGpx(pts(5), -0.1, 1)).toThrow();
    expect(() => trimGpx(pts(5), 0, 1.1)).toThrow();
  });
  it('returns [] for empty input', () => {
    expect(trimGpx([], 0, 1)).toEqual([]);
  });
  it('partitions without sharing a midpoint on rejoin', () => {
    expect(trimGpx(pts(10), 0, 0.5).at(-1)!.latitude).toBe(4);
    expect(trimGpx(pts(10), 0.5, 1)[0].latitude).toBe(5);
  });
  it('returns the single point for a 1-point track', () => {
    expect(trimGpx(pts(1), 0, 1)).toHaveLength(1);
  });
});
