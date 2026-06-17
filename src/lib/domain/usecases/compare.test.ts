import { describe, it, expect } from 'vitest';
import { COMPARE_METRICS, extractSeries, compareTracks } from './compare';
import type { TrackPoint, Sensors } from '../entities/TrackPoint';

const base = { latitude: 0, longitude: 0, elevation: null };

function tp(secondsFromEpoch: number | null, sensors: Sensors): TrackPoint {
  return {
    ...base,
    time: secondsFromEpoch === null ? null : new Date(secondsFromEpoch * 1000),
    sensors
  };
}

describe('COMPARE_METRICS', () => {
  it('lists power, hr, cadence', () => {
    expect(COMPARE_METRICS).toEqual(['power', 'hr', 'cadence']);
  });
});

describe('extractSeries', () => {
  it('returns t relative to the first timed point and the sensor value', () => {
    const pts = [
      tp(100, { power: 200 }),
      tp(110, { power: 220 }),
      tp(130, { power: 240 })
    ];
    expect(extractSeries(pts, 'power')).toEqual([
      { t: 0, v: 200 },
      { t: 10, v: 220 },
      { t: 30, v: 240 }
    ]);
  });

  it('skips points with null time', () => {
    const pts = [tp(null, { power: 200 }), tp(100, { power: 220 }), tp(110, { power: 240 })];
    expect(extractSeries(pts, 'power')).toEqual([
      { t: 0, v: 220 },
      { t: 10, v: 240 }
    ]);
  });

  it('skips points missing the requested sensor', () => {
    const pts = [tp(100, { power: 200 }), tp(110, { hr: 150 }), tp(120, { power: 240 })];
    expect(extractSeries(pts, 'power')).toEqual([
      { t: 0, v: 200 },
      { t: 20, v: 240 }
    ]);
  });

  it('reads each metric from its own sensor key', () => {
    const pts = [tp(0, { power: 200, hr: 150, cadence: 90 })];
    expect(extractSeries(pts, 'hr')).toEqual([{ t: 0, v: 150 }]);
    expect(extractSeries(pts, 'cadence')).toEqual([{ t: 0, v: 90 }]);
  });

  it('measures t from the first TIMED point even if earlier points lack time', () => {
    const pts = [tp(null, { power: 1 }), tp(200, { power: 200 }), tp(260, { power: 260 })];
    expect(extractSeries(pts, 'power')).toEqual([
      { t: 0, v: 200 },
      { t: 60, v: 260 }
    ]);
  });

  it('returns empty for an empty track', () => {
    expect(extractSeries([], 'power')).toEqual([]);
  });

  it('returns empty when no point has a time', () => {
    expect(extractSeries([tp(null, { power: 1 })], 'power')).toEqual([]);
  });

  it('treats value 0 as present', () => {
    expect(extractSeries([tp(0, { cadence: 0 })], 'cadence')).toEqual([{ t: 0, v: 0 }]);
  });
});

describe('compareTracks', () => {
  it('computes averages and percent difference', () => {
    const a = [tp(0, { power: 200 }), tp(10, { power: 300 })]; // avg 250
    const b = [tp(0, { power: 220 }), tp(10, { power: 280 })]; // avg 250
    const r = compareTracks(a, b, 'power', 0);
    expect(r.avgA).toBe(250);
    expect(r.avgB).toBe(250);
    expect(r.diffPercent).toBe(0);
  });

  it('computes a non-zero percent difference', () => {
    const a = [tp(0, { power: 100 })]; // avg 100
    const b = [tp(0, { power: 110 })]; // avg 110
    const r = compareTracks(a, b, 'power', 0);
    expect(r.diffPercent).toBeCloseTo(10);
  });

  it('shifts seriesB t values by shiftSeconds', () => {
    const a = [tp(0, { power: 100 })];
    const b = [tp(0, { power: 100 }), tp(5, { power: 120 })];
    const r = compareTracks(a, b, 'power', 3);
    expect(r.seriesB).toEqual([
      { t: 3, v: 100 },
      { t: 8, v: 120 }
    ]);
    expect(r.seriesA).toEqual([{ t: 0, v: 100 }]);
  });

  it('supports negative shift', () => {
    const b = [tp(0, { power: 100 })];
    const r = compareTracks([], b, 'power', -2);
    expect(r.seriesB).toEqual([{ t: -2, v: 100 }]);
  });

  it('returns null avg/diff when series A is empty', () => {
    const b = [tp(0, { power: 100 })];
    const r = compareTracks([], b, 'power', 0);
    expect(r.avgA).toBeNull();
    expect(r.avgB).toBe(100);
    expect(r.diffPercent).toBeNull();
  });

  it('returns null avgB when series B is empty', () => {
    const a = [tp(0, { power: 100 })];
    const r = compareTracks(a, [], 'power', 0);
    expect(r.avgA).toBe(100);
    expect(r.avgB).toBeNull();
    expect(r.diffPercent).toBeNull();
  });

  it('returns null diff when avgA is 0', () => {
    const a = [tp(0, { cadence: 0 })];
    const b = [tp(0, { cadence: 50 })];
    const r = compareTracks(a, b, 'cadence', 0);
    expect(r.avgA).toBe(0);
    expect(r.diffPercent).toBeNull();
  });
});
