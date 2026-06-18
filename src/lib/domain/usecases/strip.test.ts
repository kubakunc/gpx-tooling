import { describe, it, expect } from 'vitest';
import { stripTrack } from './strip';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (): TrackPoint => ({
  latitude: 1,
  longitude: 2,
  elevation: 100,
  time: new Date('2026-01-01T00:00:00Z'),
  sensors: { hr: 120, cadence: 80, power: 200 }
});

describe('stripTrack', () => {
  it('clears sensors only when sensors=true', () => {
    const out = stripTrack([tp()], { sensors: true });
    expect(out[0].sensors).toEqual({});
    expect(out[0].time).not.toBeNull();
    expect(out[0].elevation).toBe(100);
  });

  it('clears timestamps only when timestamps=true', () => {
    const out = stripTrack([tp()], { timestamps: true });
    expect(out[0].time).toBeNull();
    expect(out[0].sensors).toEqual({ hr: 120, cadence: 80, power: 200 });
    expect(out[0].elevation).toBe(100);
  });

  it('clears elevation only when elevation=true', () => {
    const out = stripTrack([tp()], { elevation: true });
    expect(out[0].elevation).toBeNull();
    expect(out[0].time).not.toBeNull();
    expect(out[0].sensors).toEqual({ hr: 120, cadence: 80, power: 200 });
  });

  it('clears all three fields when combined', () => {
    const out = stripTrack([tp()], { sensors: true, timestamps: true, elevation: true });
    expect(out[0].sensors).toEqual({});
    expect(out[0].time).toBeNull();
    expect(out[0].elevation).toBeNull();
    // geometry untouched
    expect(out[0].latitude).toBe(1);
    expect(out[0].longitude).toBe(2);
  });

  it('returns an unchanged copy with no opts (all false)', () => {
    const input = [tp()];
    const out = stripTrack(input, {});
    expect(out[0]).not.toBe(input[0]);
    expect(out[0].sensors).toEqual({ hr: 120, cadence: 80, power: 200 });
    expect(out[0].time).not.toBeNull();
    expect(out[0].elevation).toBe(100);
  });

  it('does not mutate the input', () => {
    const input = [tp()];
    stripTrack(input, { sensors: true, timestamps: true, elevation: true });
    expect(input[0].sensors.hr).toBe(120);
    expect(input[0].time).not.toBeNull();
    expect(input[0].elevation).toBe(100);
  });
});
