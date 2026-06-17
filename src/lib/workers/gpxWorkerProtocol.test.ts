// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { handleWorkerRequest } from './gpxWorkerProtocol';
import { serializeGpx } from '../data/serialization/GpxSerializer';
import type { TrackPoint } from '../domain/entities/TrackPoint';

const tp = (lat: number, lon: number): TrackPoint => ({
  latitude: lat,
  longitude: lon,
  elevation: null,
  time: null,
  sensors: {}
});

const GPX = `<?xml version="1.0"?>
<gpx version="1.1"><trk><trkseg>
<trkpt lat="0" lon="0"></trkpt>
<trkpt lat="0" lon="1"></trkpt>
</trkseg></trk></gpx>`;

describe('handleWorkerRequest', () => {
  it('parses GPX text', () => {
    const res = handleWorkerRequest({ id: 1, type: 'parse', name: 'a.gpx', text: GPX });
    expect(res.id).toBe(1);
    expect(res.ok).toBe(true);
    if (res.ok && res.type === 'parse') {
      expect(res.result.points).toHaveLength(2);
      expect(res.result.name).toBe('a.gpx');
    }
  });

  it('simplifies points', () => {
    const pts = [tp(0, 0), tp(0, 0.5), tp(0, 1)];
    const res = handleWorkerRequest({ id: 2, type: 'simplify', points: pts, epsilonMeters: 10 });
    expect(res.ok).toBe(true);
    if (res.ok && res.type === 'simplify') {
      expect(res.result).toHaveLength(2);
    }
  });

  it('serializes points', () => {
    const pts = [tp(0, 0), tp(0, 1)];
    const res = handleWorkerRequest({
      id: 3,
      type: 'serialize',
      points: pts,
      name: 'out',
      format: 'gpx'
    });
    expect(res.ok).toBe(true);
    if (res.ok && res.type === 'serialize') {
      expect(res.result).toBe(serializeGpx(pts, 'out'));
    }
  });

  it('returns ok:false with an error for an unknown type', () => {
    // @ts-expect-error intentional bad type for the default branch
    const res = handleWorkerRequest({ id: 4, type: 'bogus' });
    expect(res.ok).toBe(false);
    expect(res.id).toBe(4);
    if (!res.ok) expect(res.error).toContain('Unknown');
  });

  it('returns ok:false when an inner function throws (bad parse)', () => {
    const res = handleWorkerRequest({ id: 5, type: 'parse', name: 'a.gpx', text: 'not xml' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(typeof res.error).toBe('string');
  });

  it('returns ok:false when serialize gets an unknown format', () => {
    const res = handleWorkerRequest({
      id: 6,
      type: 'serialize',
      points: [tp(0, 0)],
      name: 'x',
      format: 'xyz'
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('Unsupported');
  });

  it('parses FIT bytes through importTrack', () => {
    // A non-FIT byte array with a .fit name should fail gracefully (no throw).
    const res = handleWorkerRequest({
      id: 7,
      type: 'parse',
      name: 'a.fit',
      bytes: new Uint8Array([0, 1, 2])
    });
    expect(res.ok).toBe(false);
  });
});
