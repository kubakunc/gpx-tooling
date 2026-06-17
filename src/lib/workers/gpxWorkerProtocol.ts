import type { TrackPoint } from '../domain/entities/TrackPoint';
import { importTrack } from '../data/parsing/TrackImporter';
import { simplifyRdp } from '../domain/usecases/simplify';
import { serializeAs } from '../domain/usecases/convert';

/** Parse a GPX text or FIT bytes into a track. */
export interface ParseRequest {
  id: number;
  type: 'parse';
  name: string;
  text?: string;
  bytes?: Uint8Array;
}

/** Run Ramer–Douglas–Peucker simplification. */
export interface SimplifyRequest {
  id: number;
  type: 'simplify';
  points: TrackPoint[];
  epsilonMeters: number;
}

/** Serialize points to a target format (gpx/tcx/kml). */
export interface SerializeRequest {
  id: number;
  type: 'serialize';
  points: TrackPoint[];
  name: string;
  format: string;
}

export type WorkerRequest = ParseRequest | SimplifyRequest | SerializeRequest;

export interface ParseResultPayload {
  name: string;
  points: TrackPoint[];
}

export type WorkerResponse =
  | { id: number; ok: true; type: 'parse'; result: ParseResultPayload }
  | { id: number; ok: true; type: 'simplify'; result: TrackPoint[] }
  | { id: number; ok: true; type: 'serialize'; result: string }
  | { id: number; ok: false; error: string };

/**
 * Pure dispatcher over the engine's pure functions. Never throws — any failure
 * (unknown type, bad input) is returned as `{ ok: false, error }`. This is the
 * testable core; the worker shell is a thin wrapper around it.
 */
export function handleWorkerRequest(req: WorkerRequest): WorkerResponse {
  try {
    switch (req.type) {
      case 'parse': {
        const file = importTrack(req.name, { text: req.text, bytes: req.bytes });
        return { id: req.id, ok: true, type: 'parse', result: { name: file.name, points: file.points } };
      }
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
