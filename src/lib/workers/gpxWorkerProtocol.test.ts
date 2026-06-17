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

describe('handleWorkerRequest', () => {
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

  it('treats GPX parse as an unknown (non-worker) request type', () => {
    // Parse is no longer a worker capability — it needs DOMParser (main thread).
    // parse is intentionally not a worker request type
    const res = handleWorkerRequest({
      id: 5,
      type: 'parse',
      name: 'a.gpx',
      text: 'not xml'
    } as unknown as Parameters<typeof handleWorkerRequest>[0]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('Unknown');
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
});
