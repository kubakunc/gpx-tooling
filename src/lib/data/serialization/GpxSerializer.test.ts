// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { serializeGpx } from './GpxSerializer';
import { parseGpx } from '../parsing/GpxParser';
import type { TrackPoint } from '../../domain/entities/TrackPoint';

const points: TrackPoint[] = [
  { latitude: 49.1, longitude: 19.9, elevation: 800, time: new Date('2026-01-01T00:00:00Z'), sensors: { hr: 140, cadence: 88, power: 250 } },
  { latitude: 49.2, longitude: 20.0, elevation: null, time: null, sensors: {} },
];

describe('serializeGpx', () => {
  it('produces XML that round-trips back to equivalent points', () => {
    const xml = serializeGpx(points, 'ride');
    expect(xml).toContain('<gpx');
    const back = parseGpx(xml, 'ride').points;
    expect(back[0]).toMatchObject({ latitude: 49.1, longitude: 19.9, elevation: 800 });
    expect(back[0].time?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(back[0].sensors).toEqual({ hr: 140, cadence: 88, power: 250 });
    expect(back[1].elevation).toBeNull();
    expect(back[1].time).toBeNull();
    expect(back[1].sensors).toEqual({});
  });
  it('XML-escapes the track name', () => {
    expect(serializeGpx([], 'a & b')).toContain('a &amp; b');
  });
});
