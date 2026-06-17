import { describe, it, expect } from 'vitest';
import {
  COMPARE_METRICS,
  extractSeries,
  compareTracks,
  buildChartPaths,
  comparisonToCsv
} from './compare';
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

  it('averages only over the overlapping time window after the shift', () => {
    // A spans t=0..30; B spans t=0..30. No shift -> full overlap [0,30].
    const a = [tp(0, { power: 100 }), tp(30, { power: 300 })]; // both in window
    const b = [tp(0, { power: 200 }), tp(30, { power: 400 })];
    const r = compareTracks(a, b, 'power', 0);
    expect(r.avgA).toBe(200); // (100+300)/2
    expect(r.avgB).toBe(300); // (200+400)/2
  });

  it('changing shiftSeconds changes avgB and diffPercent (chart vs stats sync)', () => {
    // A: samples at t=0,10,20 (values 100,100,100). B: t=0,10,20 (values 0,100,200).
    const a = [tp(0, { power: 100 }), tp(10, { power: 100 }), tp(20, { power: 100 })];
    const b = [tp(0, { power: 0 }), tp(10, { power: 100 }), tp(20, { power: 200 })];

    // Shift +10: B becomes t=10,20,30. Overlap with A [0,20] is [10,20].
    //   A in [10,20] -> {100,100} avg 100. B(shifted) in [10,20] -> {0,100} avg 50.
    const r1 = compareTracks(a, b, 'power', 10);
    expect(r1.avgA).toBe(100);
    expect(r1.avgB).toBe(50);
    expect(r1.diffPercent).toBeCloseTo(-50);

    // Shift -10: B becomes t=-10,0,10. Overlap with A [0,20] is [0,10].
    //   A in [0,10] -> {100,100} avg 100. B(shifted) in [0,10] -> {100,200} avg 150.
    const r2 = compareTracks(a, b, 'power', -10);
    expect(r2.avgA).toBe(100);
    expect(r2.avgB).toBe(150);
    expect(r2.diffPercent).toBeCloseTo(50);

    // Two shifts produce different numbers.
    expect(r1.avgB).not.toBe(r2.avgB);
    expect(r1.diffPercent).not.toBe(r2.diffPercent);
  });

  it('returns null avgs/diff when the shift removes all overlap', () => {
    const a = [tp(0, { power: 100 }), tp(10, { power: 100 })]; // [0,10]
    const b = [tp(0, { power: 200 }), tp(10, { power: 200 })]; // [0,10] -> shifted +100 => [100,110]
    const r = compareTracks(a, b, 'power', 100);
    expect(r.avgA).toBeNull();
    expect(r.avgB).toBeNull();
    expect(r.diffPercent).toBeNull();
    // Series are still returned for the chart (B shifted).
    expect(r.seriesB).toEqual([
      { t: 100, v: 200 },
      { t: 110, v: 200 }
    ]);
  });

  it('exposes the joint value min/max across both series for the Y-axis', () => {
    const a = [tp(0, { power: 100 }), tp(10, { power: 250 })];
    const b = [tp(0, { power: 50 }), tp(10, { power: 300 })];
    const r = compareTracks(a, b, 'power', 0);
    expect(r.valueMin).toBe(50);
    expect(r.valueMax).toBe(300);
  });

  it('reports null value min/max when both series are empty', () => {
    const r = compareTracks([], [], 'power', 0);
    expect(r.valueMin).toBeNull();
    expect(r.valueMax).toBeNull();
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

  it('returns null avg/diff when series A is empty (no overlap window)', () => {
    const b = [tp(0, { power: 100 })];
    const r = compareTracks([], b, 'power', 0);
    expect(r.avgA).toBeNull();
    expect(r.avgB).toBeNull();
    expect(r.diffPercent).toBeNull();
  });

  it('returns null avgs when series B is empty (no overlap window)', () => {
    const a = [tp(0, { power: 100 })];
    const r = compareTracks(a, [], 'power', 0);
    expect(r.avgA).toBeNull();
    expect(r.avgB).toBeNull();
    expect(r.diffPercent).toBeNull();
  });

  it('returns null diff when avgA is 0', () => {
    const a = [tp(0, { cadence: 0 }), tp(10, { cadence: 0 })];
    const b = [tp(0, { cadence: 50 }), tp(10, { cadence: 50 })];
    const r = compareTracks(a, b, 'cadence', 0);
    expect(r.avgA).toBe(0);
    expect(r.diffPercent).toBeNull();
  });
});

describe('buildChartPaths', () => {
  it('returns empty strings when both series are empty', () => {
    expect(buildChartPaths([], [], 100, 50)).toEqual({ a: '', b: '' });
  });

  it('scales the shared domain into the box (max value at top, min at bottom)', () => {
    const a = [
      { t: 0, v: 0 },
      { t: 10, v: 100 }
    ];
    const r = buildChartPaths(a, [], 100, 50);
    // t=0 -> x=0; v=0 is the min -> bottom (y=height); v=100 max -> top (y=0).
    expect(r.a).toBe('0.00,50.00 100.00,0.00');
    expect(r.b).toBe('');
  });

  it('shares the domain across both series', () => {
    const a = [{ t: 0, v: 0 }];
    const b = [{ t: 10, v: 10 }];
    const r = buildChartPaths(a, b, 100, 100);
    expect(r.a).toBe('0.00,100.00');
    expect(r.b).toBe('100.00,0.00');
  });

  it('maps a single/degenerate point without dividing by zero', () => {
    const r = buildChartPaths([{ t: 5, v: 5 }], [], 80, 40);
    expect(r.a).toBe('0.00,40.00');
  });
});

describe('comparisonToCsv', () => {
  it('emits a header and a row per sample tagged A/B', () => {
    const result = compareTracks(
      [tp(0, { power: 100 })],
      [tp(0, { power: 110 })],
      'power',
      2
    );
    const csv = comparisonToCsv(result, 'power');
    expect(csv).toBe('series,t_seconds,power\nA,0,100\nB,2,110');
  });
});
