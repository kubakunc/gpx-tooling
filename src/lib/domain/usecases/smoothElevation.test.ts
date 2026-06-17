import { describe, it, expect } from 'vitest';
import { smoothElevation, elevationFixLevelFromPercent } from './smoothElevation';
import type { TrackPoint } from '../entities/TrackPoint';

const mk = (eles: (number | null)[]): TrackPoint[] =>
  eles.map((e, i) => ({
    latitude: 45 + i * 0.001,
    longitude: 15,
    elevation: e,
    time: null,
    sensors: { hr: 100 + i },
  }));

describe('smoothElevation', () => {
  it('reduces noise in a spiky series while preserving length', () => {
    const noisy = mk([100, 200, 100, 200, 100, 200, 100]);
    const out = smoothElevation(noisy, 'low');
    expect(out).toHaveLength(noisy.length);
    // The interior values move toward the local mean (~133–167).
    expect(out[1].elevation).toBeGreaterThan(100);
    expect(out[1].elevation).toBeLessThan(200);
  });

  it('computes a correct centered window-3 average at an interior point', () => {
    const out = smoothElevation(mk([10, 40, 70]), 'low');
    // interior point: (10 + 40 + 70) / 3 = 40
    expect(out[1].elevation).toBe(40);
    // edge point uses the available window: (10 + 40) / 2 = 25
    expect(out[0].elevation).toBe(25);
  });

  it('leaves null elevations untouched and skips them in the average', () => {
    const out = smoothElevation(mk([10, null, 30]), 'low');
    expect(out[1].elevation).toBeNull();
    // point 0 window {10, null} → 10; point 2 window {null, 30} → 30
    expect(out[0].elevation).toBe(10);
    expect(out[2].elevation).toBe(30);
  });

  it('does not mutate the input and preserves sensors', () => {
    const input = mk([10, 20, 30]);
    const out = smoothElevation(input, 'medium');
    expect(input[1].elevation).toBe(20); // original untouched
    expect(out[1].sensors.hr).toBe(101);
    expect(out[1].sensors).not.toBe(input[1].sensors); // cloned
  });

  it('higher level uses a larger window (more smoothing)', () => {
    const noisy = mk([0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0]);
    const mid = noisy[8].elevation!;
    const low = smoothElevation(noisy, 'low')[8].elevation!;
    const high = smoothElevation(noisy, 'high')[8].elevation!;
    // wider window pulls the value closer to the global mean (~50) than narrow.
    expect(Math.abs(high - 50)).toBeLessThanOrEqual(Math.abs(low - 50));
    expect(low).not.toBe(mid);
  });

  it('falls back to the original elevation when every neighbor is null', () => {
    // single non-null point surrounded by nulls beyond the window
    const out = smoothElevation(mk([null, 42, null]), 'low');
    expect(out[1].elevation).toBe(42);
  });
});

describe('elevationFixLevelFromPercent', () => {
  it('maps percentages to levels with clamping', () => {
    expect(elevationFixLevelFromPercent(0)).toBe('low');
    expect(elevationFixLevelFromPercent(33)).toBe('low');
    expect(elevationFixLevelFromPercent(34)).toBe('medium');
    expect(elevationFixLevelFromPercent(66)).toBe('medium');
    expect(elevationFixLevelFromPercent(67)).toBe('high');
    expect(elevationFixLevelFromPercent(150)).toBe('high');
    expect(elevationFixLevelFromPercent(-10)).toBe('low');
  });
});
