/// <reference lib="webworker" />
import { handleWorkerRequest, type WorkerRequest } from './gpxWorkerProtocol';

// Thin shell: every message is dispatched to the pure (tested) handler and the
// response is posted back. handleWorkerRequest never throws.
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const res = handleWorkerRequest(event.data);
  (self as DedicatedWorkerGlobalScope).postMessage(res);
};
