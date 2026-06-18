import { describe, it, expect } from 'vitest';
import { setStartTime, shiftTimeSeconds, removeStillTime } from './timeTools';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (lat: number, t: string | null, lon = 0): TrackPoint => ({
  latitude: lat,
  longitude: lon,
  elevation: null,
  time: t ? new Date(t) : null,
  sensors: {}
});

describe('setStartTime', () => {
  it('moves the first timed point to newStartMs and preserves gaps', () => {
    const input = [
      tp(1, '2026-01-01T10:00:00Z'),
      tp(2, '2026-01-01T10:00:30Z'),
      tp(3, '2026-01-01T10:02:00Z')
    ];
    const newStart = Date.parse('2026-06-01T08:00:00Z');
    const out = setStartTime(input, newStart);
    expect(out[0].time?.getTime()).toBe(newStart);
    // second point keeps its +30s offset
    expect(out[1].time?.getTime()).toBe(newStart + 30_000);
    // third keeps its +120s offset
    expect(out[2].time?.getTime()).toBe(newStart + 120_000);
  });

  it('leaves untimed points untouched and shifts only timed ones', () => {
    const input = [tp(1, null), tp(2, '2026-01-01T10:00:00Z'), tp(3, '2026-01-01T10:00:10Z')];
    const newStart = Date.parse('2026-06-01T08:00:00Z');
    const out = setStartTime(input, newStart);
    expect(out[0].time).toBeNull();
    expect(out[1].time?.getTime()).toBe(newStart);
    expect(out[2].time?.getTime()).toBe(newStart + 10_000);
  });

  it('returns a copy when there are no timed points', () => {
    const input = [tp(1, null), tp(2, null)];
    const out = setStartTime(input, 123);
    expect(out.every((p) => p.time === null)).toBe(true);
    expect(out[0]).not.toBe(input[0]);
  });

  it('does not mutate the input', () => {
    const input = [tp(1, '2026-01-01T10:00:00Z')];
    setStartTime(input, 0);
    expect(input[0].time?.toISOString()).toBe('2026-01-01T10:00:00.000Z');
  });
});

describe('shiftTimeSeconds', () => {
  it('adds seconds to every timed point and leaves untimed', () => {
    const input = [tp(1, '2026-01-01T10:00:00Z'), tp(2, null)];
    const out = shiftTimeSeconds(input, 60);
    expect(out[0].time?.toISOString()).toBe('2026-01-01T10:01:00.000Z');
    expect(out[1].time).toBeNull();
  });

  it('supports negative shifts and does not mutate input', () => {
    const input = [tp(1, '2026-01-01T10:00:00Z')];
    const out = shiftTimeSeconds(input, -30);
    expect(out[0].time?.toISOString()).toBe('2026-01-01T09:59:30.000Z');
    expect(input[0].time?.toISOString()).toBe('2026-01-01T10:00:00.000Z');
  });
});

describe('removeStillTime', () => {
  it('collapses a stationary gap and shifts later points earlier', () => {
    // Points at lat 0,0 (no move for 60s = pause), then moves.
    const input = [
      tp(0, '2026-01-01T10:00:00Z'),
      tp(0, '2026-01-01T10:01:00Z'), // stationary 60s pause
      tp(0.001, '2026-01-01T10:01:10Z') // moves ~111m in 10s
    ];
    const { points, removedSeconds } = removeStillTime(input);
    expect(removedSeconds).toBe(60);
    // geometry intact
    expect(points.map((p) => p.latitude)).toEqual([0, 0, 0.001]);
    // first two coincide in time after collapsing the pause
    expect(points[0].time?.toISOString()).toBe('2026-01-01T10:00:00.000Z');
    expect(points[1].time?.toISOString()).toBe('2026-01-01T10:00:00.000Z');
    // last point shifted earlier by the removed 60s (was 10:01:10 → 10:00:10)
    expect(points[2].time?.toISOString()).toBe('2026-01-01T10:00:10.000Z');
  });

  it('removes nothing when every gap moves >= minMoveMeters', () => {
    const input = [
      tp(0, '2026-01-01T10:00:00Z'),
      tp(0.001, '2026-01-01T10:00:10Z'),
      tp(0.002, '2026-01-01T10:00:20Z')
    ];
    const { points, removedSeconds } = removeStillTime(input);
    expect(removedSeconds).toBe(0);
    expect(points[2].time?.toISOString()).toBe('2026-01-01T10:00:20.000Z');
  });

  it('respects a custom minMoveMeters threshold', () => {
    // ~111m move in 10s — under a 200m threshold it counts as "still".
    const input = [tp(0, '2026-01-01T10:00:00Z'), tp(0.001, '2026-01-01T10:00:10Z')];
    const { removedSeconds } = removeStillTime(input, { minMoveMeters: 200 });
    expect(removedSeconds).toBe(10);
  });

  it('does not mutate the input', () => {
    const input = [tp(0, '2026-01-01T10:00:00Z'), tp(0, '2026-01-01T10:01:00Z')];
    removeStillTime(input);
    expect(input[1].time?.toISOString()).toBe('2026-01-01T10:01:00.000Z');
  });

  it('returns a copy with zero removed for empty / single input', () => {
    expect(removeStillTime([]).removedSeconds).toBe(0);
    const one = [tp(0, '2026-01-01T10:00:00Z')];
    const { points, removedSeconds } = removeStillTime(one);
    expect(removedSeconds).toBe(0);
    expect(points[0]).not.toBe(one[0]);
  });
});
