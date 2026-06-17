import { describe, it, expect } from 'vitest';
import { percentToEpsilon, elevationProfilePoints, MAX_EPS } from './reduceMapping';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (ele: number | null): TrackPoint => ({
  latitude: 0,
  longitude: 0,
  elevation: ele,
  time: null,
  sensors: {}
});

describe('percentToEpsilon', () => {
  it('0% → MAX_EPS, 100% → 0', () => {
    expect(percentToEpsilon(0)).toBe(MAX_EPS);
    expect(percentToEpsilon(100)).toBe(0);
  });

  it('higher accuracy yields a smaller epsilon', () => {
    expect(percentToEpsilon(73)).toBeLessThan(percentToEpsilon(20));
  });

  it('clamps out-of-range percentages', () => {
    expect(percentToEpsilon(-50)).toBe(MAX_EPS);
    expect(percentToEpsilon(150)).toBe(0);
  });
});

describe('elevationProfilePoints', () => {
  it('returns empty for fewer than 2 elevations', () => {
    expect(elevationProfilePoints([], 100, 50)).toBe('');
    expect(elevationProfilePoints([tp(10)], 100, 50)).toBe('');
    expect(elevationProfilePoints([tp(null), tp(null)], 100, 50)).toBe('');
  });

  it('normalises into the box with y inverted (max → top)', () => {
    const pts = elevationProfilePoints([tp(0), tp(100)], 100, 50);
    const coords = pts.split(' ').map((c) => c.split(',').map(Number));
    expect(coords[0]).toEqual([0, 50]); // min elevation → bottom
    expect(coords[1]).toEqual([100, 0]); // max elevation → top
  });

  it('handles a flat track without dividing by zero', () => {
    const pts = elevationProfilePoints([tp(10), tp(10), tp(10)], 100, 40);
    expect(pts.split(' ')).toHaveLength(3);
    // flat → all at bottom (y = height)
    expect(pts.split(' ').every((c) => c.endsWith('40.0'))).toBe(true);
  });
});
