import { describe, it, expect } from 'vitest';
import { repairTrack, MAX_SPEED_MPS, MAX_DIST_METERS } from './repairFile';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (
  lat: number,
  lon: number,
  t: string | null,
  elevation: number | null = 100
): TrackPoint => ({
  latitude: lat,
  longitude: lon,
  elevation,
  time: t ? new Date(t) : null,
  sensors: {}
});

// ~0.001 deg latitude ≈ 111 m.
const M = 0.001;

describe('repairTrack', () => {
  it('exposes the strength thresholds', () => {
    expect(MAX_SPEED_MPS).toEqual({ conservative: 83, balanced: 42, aggressive: 28 });
    expect(MAX_DIST_METERS).toEqual({ conservative: 1000, balanced: 300, aggressive: 150 });
  });

  it('returns empty points and a zero report for empty input', () => {
    const { points, report } = repairTrack([], { strength: 'balanced' });
    expect(points).toEqual([]);
    expect(report).toEqual({ invalid: 0, spikes: 0, duplicates: 0, elevationFixed: 0 });
  });

  it('drops invalid points (NaN, out-of-range, exact 0,0) and counts them', () => {
    const input = [
      tp(10, 10, '2026-01-01T10:00:00Z'),
      tp(NaN, 10, '2026-01-01T10:00:10Z'),
      tp(10, 200, '2026-01-01T10:00:20Z'),
      tp(0, 0, '2026-01-01T10:00:30Z'),
      tp(91, 10, '2026-01-01T10:00:40Z'),
      tp(10.0009, 10, '2026-01-01T10:00:50Z')
    ];
    const { points, report } = repairTrack(input, { strength: 'conservative' });
    expect(report.invalid).toBe(4);
    expect(points).toHaveLength(2);
  });

  it('counts duplicate (coincident) points removed', () => {
    const input = [
      tp(10, 10, '2026-01-01T10:00:00Z'),
      tp(10, 10, '2026-01-01T10:00:00Z'), // exact dup (same time + coords)
      tp(10 + M, 10, '2026-01-01T10:00:10Z')
    ];
    const { report, points } = repairTrack(input, { strength: 'conservative' });
    expect(report.duplicates).toBe(1);
    expect(points).toHaveLength(2);
  });

  it('drops a teleport spike at balanced but keeps it at conservative', () => {
    // Move ~600 m in 10s = 60 m/s. > balanced (42), < conservative (83).
    const input = [
      tp(10, 10, '2026-01-01T10:00:00Z'),
      tp(10 + 6 * M, 10, '2026-01-01T10:00:10Z'), // ~666 m in 10s ≈ 66 m/s
      tp(10 + 6 * M + M, 10, '2026-01-01T10:00:20Z')
    ];
    const balanced = repairTrack(input, { strength: 'balanced' });
    expect(balanced.report.spikes).toBe(1);
    expect(balanced.points).toHaveLength(2);

    const conservative = repairTrack(input, { strength: 'conservative' });
    expect(conservative.report.spikes).toBe(0);
    expect(conservative.points).toHaveLength(3);
  });

  it('uses a distance threshold for untimed outliers', () => {
    // Middle point juts ~444 m (4*M) away then returns near the start:
    // > balanced (300m), < conservative (1000m) → balanced drops the one outlier.
    const input = [
      tp(10, 10, null),
      tp(10 + 4 * M, 10, null),
      tp(10 + 0.2 * M, 10, null)
    ];
    expect(repairTrack(input, { strength: 'balanced' }).report.spikes).toBe(1);
    expect(repairTrack(input, { strength: 'conservative' }).report.spikes).toBe(0);
  });

  it('sorts timed points ascending before processing', () => {
    const input = [
      tp(10 + 2 * M, 10, '2026-01-01T10:00:20Z'),
      tp(10, 10, '2026-01-01T10:00:00Z'),
      tp(10 + M, 10, '2026-01-01T10:00:10Z')
    ];
    const { points } = repairTrack(input, { strength: 'conservative' });
    const times = points.map((p) => p.time!.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(points[0].latitude).toBe(10);
  });

  it('repairs an elevation spike at balanced but not conservative', () => {
    const input = [
      tp(10, 10, '2026-01-01T10:00:00Z', 100),
      tp(10 + M, 10, '2026-01-01T10:00:10Z', 900), // +800 m spike
      tp(10 + 2 * M, 10, '2026-01-01T10:00:20Z', 110)
    ];
    expect(repairTrack(input, { strength: 'conservative' }).report.elevationFixed).toBe(0);
    const balanced = repairTrack(input, { strength: 'balanced' });
    expect(balanced.report.elevationFixed).toBe(1);
    expect(balanced.points[1].elevation).toBe((100 + 110) / 2);
  });

  it('aggressive smooths interior lat/lon jitter, endpoints unchanged', () => {
    const input = [
      tp(10, 10, '2026-01-01T10:00:00Z'),
      tp(10.0002, 10, '2026-01-01T10:00:10Z'), // small interior jitter
      tp(10.0001, 10, '2026-01-01T10:00:20Z'),
      tp(10.0003, 10, '2026-01-01T10:00:30Z')
    ];
    const { points } = repairTrack(input, { strength: 'aggressive' });
    // endpoints preserved exactly
    expect(points[0].latitude).toBe(10);
    expect(points[points.length - 1].latitude).toBe(10.0003);
    // interior point 1 = average of its neighbours' (already-smoothed-source) lats
    expect(points[1].latitude).toBeCloseTo((10 + 10.0002 + 10.0001) / 3, 9);
  });

  it('does not mutate the input', () => {
    const input = [
      tp(10, 10, '2026-01-01T10:00:00Z', 100),
      tp(10 + M, 10, '2026-01-01T10:00:10Z', 900),
      tp(10 + 2 * M, 10, '2026-01-01T10:00:20Z', 110)
    ];
    repairTrack(input, { strength: 'aggressive' });
    expect(input[1].elevation).toBe(900);
    expect(input[1].latitude).toBe(10 + M);
  });
});
