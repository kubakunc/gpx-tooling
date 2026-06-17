// Default NODE environment (NO happy-dom) — there is no `DOMParser` here, just
// as in a real Web Worker global. This is the regression guard for the import
// bug: GPX parse must NOT be a worker capability (it needs `DOMParser`, which a
// worker lacks). The worker keeps only DOM-free work: RDP simplify + serialize.
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

describe('handleWorkerRequest without a DOM (worker-like node env)', () => {
  it('has no DOMParser available (mimics a Web Worker global)', () => {
    expect(typeof DOMParser).toBe('undefined');
  });

  it('simplifies points without a DOM', () => {
    const pts = [tp(0, 0), tp(0, 0.5), tp(0, 1)];
    const res = handleWorkerRequest({ id: 1, type: 'simplify', points: pts, epsilonMeters: 10 });
    expect(res.ok).toBe(true);
    if (res.ok && res.type === 'simplify') {
      expect(res.result).toHaveLength(2);
    }
  });

  it('serializes points without a DOM', () => {
    const pts = [tp(0, 0), tp(0, 1)];
    const res = handleWorkerRequest({ id: 2, type: 'serialize', points: pts, name: 'out', format: 'gpx' });
    expect(res.ok).toBe(true);
    if (res.ok && res.type === 'serialize') {
      expect(res.result).toBe(serializeGpx(pts, 'out'));
    }
  });

  it('does NOT expose GPX parse as a worker capability', () => {
    // After the fix, `parse` is not a known request type; the dispatcher must
    // report it as unknown rather than attempting a DOM-dependent parse that
    // would throw `ReferenceError: DOMParser is not defined` in a worker.
    // parse is intentionally no longer a worker request type
    const res = handleWorkerRequest({
      id: 3,
      type: 'parse',
      name: 'a.gpx',
      text: '<gpx/>'
    } as unknown as Parameters<typeof handleWorkerRequest>[0]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('Unknown');
  });
});
