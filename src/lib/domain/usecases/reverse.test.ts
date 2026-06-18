import { describe, it, expect } from 'vitest';
import { reverseTrack } from './reverse';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (lat: number, t: string | null, sensors: TrackPoint['sensors'] = {}): TrackPoint => ({
  latitude: lat,
  longitude: 0,
  elevation: lat * 10,
  time: t ? new Date(t) : null,
  sensors
});

describe('reverseTrack', () => {
  it('reverses geometry order (and elevation/sensors travel with their points)', () => {
    const input = [tp(1, null, { hr: 100 }), tp(2, null, { hr: 110 }), tp(3, null, { hr: 120 })];
    const out = reverseTrack(input);
    expect(out.map((p) => p.latitude)).toEqual([3, 2, 1]);
    expect(out.map((p) => p.elevation)).toEqual([30, 20, 10]);
    expect(out.map((p) => p.sensors.hr)).toEqual([120, 110, 100]);
  });

  it('rebuilds forward timestamps from reversed gaps when all points are timed', () => {
    // gaps forward: 10s, then 30s. Reversed gaps: 30s, then 10s.
    const input = [
      tp(1, '2026-01-01T00:00:00Z'),
      tp(2, '2026-01-01T00:00:10Z'),
      tp(3, '2026-01-01T00:00:40Z')
    ];
    const out = reverseTrack(input);
    expect(out.map((p) => p.latitude)).toEqual([3, 2, 1]);
    // t0 preserved
    expect(out[0].time?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    // first reversed gap = 30s
    expect(out[1].time?.toISOString()).toBe('2026-01-01T00:00:30.000Z');
    // second reversed gap = 10s
    expect(out[2].time?.toISOString()).toBe('2026-01-01T00:00:40.000Z');
    // times still ascending
    expect(out[0].time!.getTime()).toBeLessThan(out[1].time!.getTime());
    expect(out[1].time!.getTime()).toBeLessThan(out[2].time!.getTime());
    // same total duration
    const origDur = input[2].time!.getTime() - input[0].time!.getTime();
    const newDur = out[2].time!.getTime() - out[0].time!.getTime();
    expect(newDur).toBe(origDur);
  });

  it('produces strictly increasing timestamps and same total duration for UNSORTED timed input', () => {
    // Deliberately out-of-order timestamps (not ascending). Gaps once sorted
    // ascending are 10s then 30s → total 40s.
    const input = [
      tp(2, '2026-01-01T00:00:10Z'),
      tp(3, '2026-01-01T00:00:40Z'),
      tp(1, '2026-01-01T00:00:00Z')
    ];
    const out = reverseTrack(input);
    // Geometry travels with the time-sorted-then-reversed order: latest-time
    // point first (lat 3), then lat 2, then lat 1.
    expect(out.map((p) => p.latitude)).toEqual([3, 2, 1]);
    // Timestamps strictly increasing.
    for (let i = 1; i < out.length; i++) {
      expect(out[i].time!.getTime()).toBeGreaterThan(out[i - 1].time!.getTime());
    }
    // Earliest original timestamp preserved as the new t0.
    expect(out[0].time?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    // First reversed gap = 30s, then 10s.
    expect(out[1].time?.toISOString()).toBe('2026-01-01T00:00:30.000Z');
    expect(out[2].time?.toISOString()).toBe('2026-01-01T00:00:40.000Z');
    // Same total duration as the input span (max - min = 40s).
    const newDur = out[out.length - 1].time!.getTime() - out[0].time!.getTime();
    expect(newDur).toBe(40_000);
  });

  it('nulls all times when any point is untimed', () => {
    const input = [tp(1, '2026-01-01T00:00:00Z'), tp(2, null), tp(3, '2026-01-01T00:00:40Z')];
    const out = reverseTrack(input);
    expect(out.map((p) => p.latitude)).toEqual([3, 2, 1]);
    expect(out.every((p) => p.time === null)).toBe(true);
  });

  it('does not mutate the input (points or sensors)', () => {
    const input = [tp(1, '2026-01-01T00:00:00Z', { hr: 100 }), tp(2, '2026-01-01T00:00:10Z')];
    const out = reverseTrack(input);
    out[0].sensors.hr = 999;
    out[0].latitude = -1;
    expect(input[0].latitude).toBe(1);
    expect(input[0].sensors.hr).toBe(100);
    expect(input[0].time?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns a copy for <= 1 point', () => {
    expect(reverseTrack([])).toEqual([]);
    const one = [tp(5, '2026-01-01T00:00:00Z')];
    const out = reverseTrack(one);
    expect(out).toHaveLength(1);
    expect(out[0]).not.toBe(one[0]);
    expect(out[0].latitude).toBe(5);
  });
});
