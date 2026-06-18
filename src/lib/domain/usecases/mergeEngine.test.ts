import { describe, it, expect } from 'vitest';
import {
  shiftPoints,
  fileStartMs,
  fileEndMs,
  detectTimeOverlaps,
  dedupePoints,
  splitIntoSegments
} from './mergeEngine';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (lat: number, t: string | null): TrackPoint => ({
  latitude: lat,
  longitude: 0,
  elevation: null,
  time: t ? new Date(t) : null,
  sensors: {}
});

describe('shiftPoints', () => {
  it('shifts timed points by seconds, leaves untimed and is non-mutating', () => {
    const input = [tp(1, '2026-01-01T00:00:00Z'), tp(2, null)];
    const out = shiftPoints(input, 60);
    expect(out[0].time?.toISOString()).toBe('2026-01-01T00:01:00.000Z');
    expect(out[1].time).toBeNull();
    expect(input[0].time?.toISOString()).toBe('2026-01-01T00:00:00.000Z'); // not mutated
  });
});

describe('fileStartMs/fileEndMs', () => {
  it('returns min/max timestamp or null when untimed', () => {
    const pts = [tp(1, '2026-01-01T00:01:00Z'), tp(2, '2026-01-01T00:00:00Z')];
    expect(fileStartMs(pts)).toBe(Date.parse('2026-01-01T00:00:00Z'));
    expect(fileEndMs(pts)).toBe(Date.parse('2026-01-01T00:01:00Z'));
    expect(fileStartMs([tp(1, null)])).toBeNull();
  });
});

describe('detectTimeOverlaps', () => {
  it('flags a file that starts before the previous ends', () => {
    const a = [tp(1, '2026-01-01T00:00:00Z'), tp(2, '2026-01-01T00:10:00Z')];
    const b = [tp(3, '2026-01-01T00:05:00Z'), tp(4, '2026-01-01T00:15:00Z')]; // overlaps A by 5 min
    const issues = detectTimeOverlaps([a, b]);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe('overlap');
    expect(issues[0].seconds).toBe(300);
    expect(issues[0].fileIndex).toBe(1);
  });
  it('no overlap for sequential ranges or untimed files', () => {
    const a = [tp(1, '2026-01-01T00:00:00Z'), tp(2, '2026-01-01T00:10:00Z')];
    const b = [tp(3, '2026-01-01T00:11:00Z')];
    expect(detectTimeOverlaps([a, b])).toEqual([]);
    expect(detectTimeOverlaps([[tp(1, null)], [tp(2, null)]])).toEqual([]);
  });
});

describe('dedupePoints', () => {
  it('drops a point with the same timestamp as its predecessor', () => {
    const pts = [
      tp(1, '2026-01-01T00:00:00Z'),
      tp(1, '2026-01-01T00:00:00Z'),
      tp(2, '2026-01-01T00:00:01Z')
    ];
    const { points, removed } = dedupePoints(pts);
    expect(points).toHaveLength(2);
    expect(removed).toBe(1);
  });
  it('drops a near-coincident untimed point (<0.5m)', () => {
    const a = { latitude: 50.0, longitude: 19.0, elevation: null, time: null, sensors: {} };
    const { points, removed } = dedupePoints([
      a,
      { ...a },
      { latitude: 50.001, longitude: 19.0, elevation: null, time: null, sensors: {} }
    ]);
    expect(points).toHaveLength(2);
    expect(removed).toBe(1);
  });
  it('keeps distinct points', () => {
    expect(
      dedupePoints([tp(1, '2026-01-01T00:00:00Z'), tp(2, '2026-01-01T00:00:01Z')]).removed
    ).toBe(0);
  });
  it('handles an empty input', () => {
    expect(dedupePoints([])).toEqual({ points: [], removed: 0 });
  });
});

describe('splitIntoSegments', () => {
  const opts = { gapMeters: 100, maxSpeedMps: 42, forceContinuous: false };
  it('splits on a >gap jump and reports a gap issue', () => {
    const pts = [tp(0, '2026-01-01T00:00:00Z'), tp(0, '2026-01-01T00:00:01Z')];
    pts[1] = { ...pts[1], latitude: 0.01 }; // ~1.1km from pts[0]
    const { segments, issues } = splitIntoSegments(pts, opts);
    expect(segments).toHaveLength(2);
    expect(issues.some((i) => i.kind === 'gap')).toBe(true);
  });
  it('forceContinuous yields a single segment and no split issues', () => {
    const pts = [
      tp(0, '2026-01-01T00:00:00Z'),
      { ...tp(0, '2026-01-01T00:00:01Z'), latitude: 0.01 }
    ];
    const { segments, issues } = splitIntoSegments(pts, { ...opts, forceContinuous: true });
    expect(segments).toHaveLength(1);
    expect(issues).toEqual([]);
  });
  it('flags a teleport (impossible speed) within the gap threshold', () => {
    // 89m in 1s = 89 m/s ~320km/h, under 100m gap but over maxSpeed
    const a = tp(0, '2026-01-01T00:00:00Z');
    const b = { ...tp(0, '2026-01-01T00:00:01Z'), latitude: 0.0008 }; // ~89m
    const { segments, issues } = splitIntoSegments([a, b], opts);
    expect(segments).toHaveLength(2);
    expect(issues.some((i) => i.kind === 'teleport')).toBe(true);
  });
  it('splits on a long time pause when timeGapSeconds is set', () => {
    const a = tp(0, '2026-01-01T00:00:00Z');
    const b = { ...tp(0, '2026-01-01T01:00:00Z'), latitude: 0.00001 }; // tiny move, 1h pause
    const { segments, issues } = splitIntoSegments([a, b], { ...opts, timeGapSeconds: 600 });
    expect(segments).toHaveLength(2);
    expect(issues.some((i) => i.kind === 'gap' && i.seconds !== undefined)).toBe(true);
  });
  it('returns [] for empty and [pts] for a clean track', () => {
    expect(splitIntoSegments([], opts).segments).toEqual([]);
    const clean = [
      tp(0, '2026-01-01T00:00:00Z'),
      { ...tp(0, '2026-01-01T00:00:30Z'), latitude: 0.0001 }
    ];
    expect(splitIntoSegments(clean, opts).segments).toHaveLength(1);
  });
});
