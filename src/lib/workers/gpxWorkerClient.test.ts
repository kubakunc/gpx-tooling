// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { GpxWorkerClient, type WorkerLike } from './gpxWorkerClient';
import { handleWorkerRequest, type WorkerRequest, type WorkerResponse } from './gpxWorkerProtocol';
import { serializeGpx } from '../data/serialization/GpxSerializer';
import type { TrackPoint } from '../domain/entities/TrackPoint';

const tp = (lat: number, lon: number): TrackPoint => ({
  latitude: lat,
  longitude: lon,
  elevation: null,
  time: null,
  sensors: {}
});

/** Fake worker that dispatches synchronously via the real handler. */
function makeFakeWorker(): WorkerLike & { posted: WorkerRequest[] } {
  const w: WorkerLike & { posted: WorkerRequest[] } = {
    posted: [],
    onmessage: null,
    onerror: null,
    postMessage(message: unknown) {
      w.posted.push(message as WorkerRequest);
      const res = handleWorkerRequest(message as WorkerRequest);
      // Async-ish: invoke synchronously but through the handler hook.
      w.onmessage?.({ data: res });
    },
    terminate() {}
  };
  return w;
}

describe('GpxWorkerClient sync fallback', () => {
  it('runs simplify synchronously when no worker is available', async () => {
    const client = new GpxWorkerClient({ createWorker: () => null });
    const r = await client.runSimplify([tp(0, 0), tp(0, 0.5), tp(0, 1)], 10);
    expect(r).toHaveLength(2);
  });

  it('serializes synchronously', async () => {
    const client = new GpxWorkerClient({ createWorker: () => null });
    const pts = [tp(0, 0), tp(0, 1)];
    const r = await client.runSerialize(pts, 'x', 'gpx');
    expect(r).toBe(serializeGpx(pts, 'x'));
  });

  it('falls back when worker construction throws', async () => {
    const client = new GpxWorkerClient({
      createWorker: () => {
        throw new Error('boom');
      }
    });
    const r = await client.runSimplify([tp(0, 0), tp(0, 1)], 10);
    expect(r).toHaveLength(2);
  });

  it('rejects (not hang) when the pure op errors', async () => {
    const client = new GpxWorkerClient({ createWorker: () => null });
    await expect(client.runSerialize([tp(0, 0)], 'x', 'bogus')).rejects.toThrow(/Unsupported/);
  });
});

describe('GpxWorkerClient with a worker', () => {
  it('routes simplify through the worker and correlates the id', async () => {
    const fake = makeFakeWorker();
    const client = new GpxWorkerClient({ createWorker: () => fake });
    const r = await client.runSimplify([tp(0, 0), tp(0, 0.5), tp(0, 1)], 10);
    expect(r).toHaveLength(2);
    expect(fake.posted[0]).toMatchObject({ type: 'simplify', id: 1 });
  });

  it('handles two concurrent requests by id', async () => {
    const fake = makeFakeWorker();
    const client = new GpxWorkerClient({ createWorker: () => fake });
    const [a, b] = await Promise.all([
      client.runSimplify([tp(0, 0), tp(0, 1)], 10),
      client.runSerialize([tp(0, 0), tp(0, 1)], 'n', 'gpx')
    ]);
    expect(a).toHaveLength(2);
    expect(typeof b).toBe('string');
  });

  it('rejects on a worker error response', async () => {
    const fake = makeFakeWorker();
    const client = new GpxWorkerClient({ createWorker: () => fake });
    await expect(client.runSerialize([tp(0, 0)], 'x', 'bogus')).rejects.toThrow();
  });

  it('falls back to sync when postMessage throws', async () => {
    const fake = makeFakeWorker();
    fake.postMessage = () => {
      throw new Error('post failed');
    };
    const client = new GpxWorkerClient({ createWorker: () => fake });
    const r = await client.runSimplify([tp(0, 0), tp(0, 1)], 10);
    expect(r).toHaveLength(2);
  });

  it('resolves in-flight requests as failures when the worker errors', async () => {
    // A worker that records the request but never responds, then errors.
    let captured: ((res: WorkerResponse) => void) | null = null;
    const fake: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage() {
        captured = (res) => fake.onmessage?.({ data: res });
      },
      terminate() {}
    };
    const terminate = vi.spyOn(fake, 'terminate');
    const client = new GpxWorkerClient({ createWorker: () => fake });
    const promise = client.runSimplify([tp(0, 0), tp(0, 1)], 10);
    // Trigger the worker-level error path with an ErrorEvent-like message.
    fake.onerror?.({ message: 'boom in worker' });
    await expect(promise).rejects.toThrow(/boom in worker/i);
    expect(captured).not.toBeNull();
    // The worker must be terminated before being dropped.
    expect(terminate).toHaveBeenCalled();
  });

  it('falls back to sync for new requests after a worker crash', async () => {
    const fake = makeFakeWorker();
    const client = new GpxWorkerClient({ createWorker: () => fake });
    // Crash with no message — generic error string is used.
    fake.onerror?.({});
    // A fresh request now runs synchronously (no worker), still resolving.
    const r = await client.runSimplify([tp(0, 0), tp(0, 0.5), tp(0, 1)], 10);
    expect(r).toHaveLength(2);
  });

  it('ignores responses for unknown ids', () => {
    const fake = makeFakeWorker();
    const client = new GpxWorkerClient({ createWorker: () => fake });
    // Directly poke onmessage with a stale id — should not throw.
    expect(() => fake.onmessage?.({ data: { id: 999, ok: true, type: 'simplify', result: [] } })).not.toThrow();
    void client;
  });

  it('parses through the worker', async () => {
    const fake = makeFakeWorker();
    const client = new GpxWorkerClient({ createWorker: () => fake });
    const GPX = `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg><trkpt lat="0" lon="0"></trkpt><trkpt lat="0" lon="1"></trkpt></trkseg></trk></gpx>`;
    const r = await client.runParse('a.gpx', { text: GPX });
    expect(r.points).toHaveLength(2);
  });

  it('dispose terminates the worker and resets', async () => {
    const fake = makeFakeWorker();
    const terminate = vi.spyOn(fake, 'terminate');
    const client = new GpxWorkerClient({ createWorker: () => fake });
    await client.runSimplify([tp(0, 0), tp(0, 1)], 10);
    client.dispose();
    expect(terminate).toHaveBeenCalled();
  });
});
