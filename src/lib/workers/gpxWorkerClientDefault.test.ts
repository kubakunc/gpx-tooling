// Node environment (no Worker global) exercises the SSR/old-WebView fallback
// branch of the default worker factory and the default client constructor.
import { describe, it, expect } from 'vitest';
import { defaultCreateWorker, GpxWorkerClient } from './gpxWorkerClient';
import type { TrackPoint } from '../domain/entities/TrackPoint';

const tp = (lat: number, lon: number): TrackPoint => ({
  latitude: lat,
  longitude: lon,
  elevation: null,
  time: null,
  sensors: {}
});

describe('defaultCreateWorker (no Worker global)', () => {
  it('returns null when Worker is undefined', () => {
    expect(typeof Worker).toBe('undefined');
    expect(defaultCreateWorker()).toBeNull();
  });

  it('a default client falls back to synchronous handling', async () => {
    const client = new GpxWorkerClient();
    const r = await client.runSimplify([tp(0, 0), tp(0, 0.5), tp(0, 1)], 10);
    expect(r).toHaveLength(2);
  });
});
