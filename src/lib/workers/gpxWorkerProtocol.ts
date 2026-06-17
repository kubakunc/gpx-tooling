import type { TrackPoint } from '../domain/entities/TrackPoint';
import { simplifyRdp } from '../domain/usecases/simplify';
import { serializeAs } from '../domain/usecases/convert';

/**
 * Run Ramer–Douglas–Peucker simplification.
 *
 * NOTE: GPX text parsing is deliberately NOT a worker capability. Parsing uses
 * `DOMParser`, which does not exist in a Web Worker global, so parse must run on
 * the main thread (see FileService). The worker handles only DOM-free work.
 */
export interface SimplifyRequest {
  id: number;
  type: 'simplify';
  points: TrackPoint[];
  epsilonMeters: number;
}

/** Serialize points to a target format (gpx/tcx/kml). DOM-free. */
export interface SerializeRequest {
  id: number;
  type: 'serialize';
  points: TrackPoint[];
  name: string;
  format: string;
}

export type WorkerRequest = SimplifyRequest | SerializeRequest;

export type WorkerResponse =
  | { id: number; ok: true; type: 'simplify'; result: TrackPoint[] }
  | { id: number; ok: true; type: 'serialize'; result: string }
  | { id: number; ok: false; error: string };

/**
 * Pure dispatcher over the engine's DOM-free pure functions. Never throws — any
 * failure (unknown type, bad input) is returned as `{ ok: false, error }`. This
 * is the testable core; the worker shell is a thin wrapper around it.
 */
export function handleWorkerRequest(req: WorkerRequest): WorkerResponse {
  try {
    switch (req.type) {
      case 'simplify': {
        return {
          id: req.id,
          ok: true,
          type: 'simplify',
          result: simplifyRdp(req.points, req.epsilonMeters)
        };
      }
      case 'serialize': {
        return {
          id: req.id,
          ok: true,
          type: 'serialize',
          result: serializeAs(req.format, req.points, req.name)
        };
      }
      default: {
        const unknown = req as { type?: string };
        return { id: (req as { id: number }).id, ok: false, error: `Unknown request type: ${unknown.type}` };
      }
    }
  } catch (e) {
    return { id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
