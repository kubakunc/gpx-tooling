import { describe, it, expect } from 'vitest';
import { mergeChronologically } from './merge';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (lat: number, t: string | null, hr?: number): TrackPoint => ({
  latitude: lat, longitude: 0, elevation: null, time: t ? new Date(t) : null, sensors: hr ? { hr } : {},
});

describe('mergeChronologically', () => {
  it('interleaves points from multiple tracks by time and preserves sensors', () => {
    const a = [tp(1, '2026-01-01T00:00:00Z', 120), tp(2, '2026-01-01T00:02:00Z')];
    const b = [tp(3, '2026-01-01T00:01:00Z', 130)];
    const r = mergeChronologically([a, b]);
    expect(r.map((p) => p.latitude)).toEqual([1, 3, 2]);
    expect(r[0].sensors.hr).toBe(120);
    expect(r[1].sensors.hr).toBe(130);
  });
  it('places untimed points after timed ones, stably', () => {
    const a = [tp(1, null), tp(2, '2026-01-01T00:00:00Z')];
    const r = mergeChronologically([a]);
    expect(r.map((p) => p.latitude)).toEqual([2, 1]);
  });
  it('returns [] for no input', () => {
    expect(mergeChronologically([])).toEqual([]);
  });
  it('keeps original order among purely untimed points', () => {
    const a = [tp(1, null), tp(2, null), tp(3, null)];
    const r = mergeChronologically([a]);
    expect(r.map((p) => p.latitude)).toEqual([1, 2, 3]);
  });
});
