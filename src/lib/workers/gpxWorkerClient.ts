import type { TrackPoint } from '../domain/entities/TrackPoint';
import {
  handleWorkerRequest,
  type WorkerRequest,
  type WorkerResponse
} from './gpxWorkerProtocol';

/** Minimal structural view of the Worker we depend on (for testability). */
export interface WorkerLike {
  postMessage(message: unknown): void;
  onmessage: ((event: { data: WorkerResponse }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  terminate(): void;
}

export interface WorkerClientDeps {
  /**
   * Factory that constructs the worker. Defaults to a module Worker via
   * `import.meta.url`. Return `null` to force the synchronous fallback.
   */
  createWorker?: () => WorkerLike | null;
}

/**
 * Default worker factory. Returns `null` when `Worker` is unavailable (SSR,
 * tests, old WebView), which puts the client into synchronous-fallback mode.
 * Exported so the no-Worker branch is unit-testable.
 */
export function defaultCreateWorker(): WorkerLike | null {
  if (typeof Worker === 'undefined') return null;
  return new Worker(new URL('./gpx.worker.ts', import.meta.url), {
    type: 'module'
  }) as unknown as WorkerLike;
}

interface Pending {
  resolve: (res: WorkerResponse) => void;
}

/** Best-effort extraction of a human-readable message from a worker error event. */
function errorEventMessage(event: unknown): string | null {
  if (typeof event === 'object' && event !== null && 'message' in event) {
    const m = (event as { message: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return null;
}

/** A request payload without the correlation id (the client assigns it). */
type WorkerRequestBody =
  | Omit<Extract<WorkerRequest, { type: 'simplify' }>, 'id'>
  | Omit<Extract<WorkerRequest, { type: 'serialize' }>, 'id'>;

/**
 * Typed client over the GPX worker. Correlates requests/responses by id and
 * resolves a Promise per call. When no Worker is available (SSR, tests, old
 * WebView) or construction throws, it runs the pure dispatcher synchronously.
 * It never hangs: a worker error rejects all in-flight requests.
 */
export class GpxWorkerClient {
  private createWorker: () => WorkerLike | null;
  private worker: WorkerLike | null = null;
  private initialized = false;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(deps: WorkerClientDeps = {}) {
    this.createWorker = deps.createWorker ?? defaultCreateWorker;
  }

  /** Lazily create the worker once; on any failure, stay in sync-fallback mode. */
  private ensureWorker(): WorkerLike | null {
    if (this.initialized) return this.worker;
    this.initialized = true;
    try {
      this.worker = this.createWorker();
    } catch {
      this.worker = null;
    }
    if (this.worker) {
      this.worker.onmessage = (event) => this.onMessage(event.data);
      this.worker.onerror = (event) => this.onError(event);
    }
    return this.worker;
  }

  private onMessage(res: WorkerResponse): void {
    const p = this.pending.get(res.id);
    if (!p) return;
    this.pending.delete(res.id);
    p.resolve(res);
  }

  /** A worker-level error fails every in-flight request so callers never hang. */
  private onError(event?: unknown): void {
    // Terminate the crashed worker before dropping our reference so it can't
    // keep running or leak. Subsequent calls fall back to synchronous handling
    // (ensureWorker won't re-create it because `initialized` stays true).
    this.worker?.terminate();
    const detail = errorEventMessage(event);
    const error = detail ? `Worker crashed: ${detail}` : 'Worker crashed';
    // Resolve each pending request with its own real id (not a -1 sentinel) so
    // callers/logs can correlate the failure to the originating request.
    for (const [id, p] of this.pending) {
      p.resolve({ id, ok: false, error });
    }
    this.pending.clear();
    this.worker = null;
  }

  private run(req: WorkerRequestBody): Promise<WorkerResponse> {
    const id = this.nextId++;
    const full = { ...req, id } as WorkerRequest;
    const worker = this.ensureWorker();
    if (!worker) {
      return Promise.resolve(handleWorkerRequest(full));
    }
    return new Promise<WorkerResponse>((resolve) => {
      this.pending.set(id, { resolve });
      try {
        worker.postMessage(full);
      } catch {
        this.pending.delete(id);
        resolve(handleWorkerRequest(full));
      }
    });
  }

  async runSimplify(points: TrackPoint[], epsilonMeters: number): Promise<TrackPoint[]> {
    const res = await this.run({ type: 'simplify', points, epsilonMeters });
    if (res.ok && res.type === 'simplify') return res.result;
    throw new Error(res.ok ? 'Unexpected response' : res.error);
  }

  async runSerialize(points: TrackPoint[], name: string, format: string): Promise<string> {
    const res = await this.run({ type: 'serialize', points, name, format });
    if (res.ok && res.type === 'serialize') return res.result;
    throw new Error(res.ok ? 'Unexpected response' : res.error);
  }

  /** Release the underlying worker (if any). */
  dispose(): void {
    if (this.worker) this.worker.terminate();
    this.worker = null;
    this.initialized = false;
    this.pending.clear();
  }
}

/** Shared singleton for screens. */
export const gpxWorkerClient = new GpxWorkerClient();
