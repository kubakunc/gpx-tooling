import { describe, it, expect } from 'vitest';
import { totalDistanceMeters, elevationGainMeters, durationSeconds } from './stats';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (lat: number, lon: number, ele: number | null = null, t: string | null = null): TrackPoint => ({
  latitude: lat, longitude: lon, elevation: ele, time: t ? new Date(t) : null, sensors: {},
});

describe('stats', () => {
  it('totalDistanceMeters sums segment lengths; 0 for <2 points', () => {
    expect(totalDistanceMeters([])).toBe(0);
    expect(totalDistanceMeters([tp(0, 0)])).toBe(0);
    const d = totalDistanceMeters([tp(0, 0), tp(0, 1), tp(0, 2)]);
    expect(d).toBeGreaterThan(220000);
    expect(d).toBeLessThan(224000);
  });
  it('elevationGainMeters sums only positive deltas, ignoring nulls', () => {
    expect(elevationGainMeters([tp(0, 0, 100), tp(0, 0, 110), tp(0, 0, 105), tp(0, 0, 130)])).toBe(35);
    expect(elevationGainMeters([tp(0, 0, null), tp(0, 0, 110), tp(0, 0, null), tp(0, 0, 130)])).toBe(20);
  });
  it('durationSeconds is the gap between first and last timed points; 0 if untimed', () => {
    expect(durationSeconds([tp(0, 0, null, '2026-01-01T00:00:00Z'), tp(0, 0, null, '2026-01-01T00:01:40Z')])).toBe(100);
    expect(durationSeconds([tp(0, 0)])).toBe(0);
  });
});
