import { describe, it, expect } from 'vitest';
import { repairElevation } from './repairElevation';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (ele: number | null, t?: string): TrackPoint => ({
  latitude: 0, longitude: 0, elevation: ele, time: t ? new Date(t) : null, sensors: {},
});

describe('repairElevation', () => {
  it('interpolates a >100m spike across a <1s gap', () => {
    const r = repairElevation([
      tp(100, '2026-01-01T00:00:00Z'),
      tp(900, '2026-01-01T00:00:00.500Z'), // spike
      tp(110, '2026-01-01T00:00:01Z'),
    ]);
    expect(r[1].elevation).toBeCloseTo(105, 0);
  });
  it('leaves a legitimate gradual climb untouched', () => {
    const input = [tp(100, '2026-01-01T00:00:00Z'), tp(150, '2026-01-01T00:01:00Z'), tp(200, '2026-01-01T00:02:00Z')];
    expect(repairElevation(input).map((p) => p.elevation)).toEqual([100, 150, 200]);
  });
  it('does not mutate the input array', () => {
    const input = [tp(100, '2026-01-01T00:00:00Z'), tp(900, '2026-01-01T00:00:00.500Z'), tp(110, '2026-01-01T00:00:01Z')];
    const before = input[1].elevation;
    repairElevation(input);
    expect(input[1].elevation).toBe(before);
  });
  it('skips points with null elevation', () => {
    const input = [tp(null), tp(null), tp(null)];
    expect(repairElevation(input).map((p) => p.elevation)).toEqual([null, null, null]);
  });
});
