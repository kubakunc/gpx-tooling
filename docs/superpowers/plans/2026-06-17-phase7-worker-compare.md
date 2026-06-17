# Phase 7: Web Worker + Compare Tracks + Robustness

> REQUIRED: subagent-driven-development + TDD. ≥90% coverage gate stays green. Three-stage review (spec, code, UX) after. This completes the planned app.

**Goal:** (A) **Compare tracks** real logic + wired screen (last unwired tool); (B) **Web Worker** offloading for heavy parse/RDP/serialize so the UI stays responsive on large tracks; (C) **robustness pass** — debounce heavy sliders, confirm graceful failure everywhere.

**References:** spec §5 (worker), §8 (robustness); the Compare screen exists as a preview (`tools/compare/+page.svelte`) with mock data + a "Soon" pill.

---

## Part A — Compare tracks (real)

### A1: compare use-case (TDD)
- `src/lib/domain/usecases/compare.ts` (pure):
  - `COMPARE_METRICS = ['power','hr','cadence'] as const`.
  - `extractSeries(points: TrackPoint[], metric): {t:number; v:number}[]` — for each point with a non-null `time` AND a present sensor value for `metric` (note `hr`/`cadence`/`power` keys; metric 'hr'→sensors.hr, 'cadence'→sensors.cadence, 'power'→sensors.power), `t` = seconds from the track's first timed point, `v` = the value.
  - `compareTracks(a: TrackPoint[], b: TrackPoint[], metric, shiftSeconds: number): { seriesA; seriesB; avgA: number|null; avgB: number|null; diffPercent: number|null }` — seriesB has `shiftSeconds` added to each `t`; averages over each series' values; `diffPercent = avgA ? (avgB-avgA)/avgA*100 : null`. Null-safe when a series is empty.
- TDD: series extraction skips null-time/missing-sensor points; shift offsets B's t; averages + diff correct; empty series → null avg/diff.
- Commit `feat: add compare-tracks use-case + tests`.

### A2: wire Compare screen
- `tools/compare/+page.svelte`: remove the "Preview" banner + the hub "Soon" pill (drop `soon` on the compare tile in `(tabs)/+page.svelte`). 
- Two file selectors (A and B) from `loadedFiles` (reuse/adapt `ActiveFileSelector` or a simple pair of dropdowns); default to the first two loaded files. Empty state when fewer than 2 files loaded ("Import two files to compare").
- Metric `SegmentedControl` (Power/Heart rate/Cadence) → real series; if neither track has that sensor, show a note.
- Overlaid line chart (SVG) built from `seriesA`/`seriesB` (scale to the chart box); two colored lines (A indigo, B amber per design).
- Shift control (−/+ stepper + slider) sets `shiftSeconds`; live re-compare.
- Avg A / Avg B / Difference stat row from real numbers; "Save comparison" → export a small summary (e.g. a GPX/text note) or, simplest, a toast with the result + optional CSV share via FileService. (IMPLEMENTER: pick the simplest honest "save" — exporting a CSV of the aligned series via `exportAndShare` is fine; if that's heavy, make "Save comparison" copy the summary to a shared text file.)
- Commit `feat: wire Compare tracks screen`.

## Part B — Web Worker offloading

### B1: worker message protocol (TDD, pure dispatcher)
- `src/lib/workers/gpxWorkerProtocol.ts` (pure): message types + a `handleWorkerRequest(req): res` switch that calls the existing pure functions: `parse` (text→`parseGpx` / bytes→`parseFit` via `importTrack`), `simplify` (points,eps→`simplifyRdp`), `serialize` (points,name,format→`serializeAs`). Returns `{ok,result}` or `{ok:false,error}` (never throws). This is the testable core (no Worker global needed).
- TDD: each request type dispatches correctly; unknown type / thrown inner error → `{ok:false,error}`.
- Commit `feat: add worker request dispatcher + tests`.

### B2: worker + typed client with sync fallback
- `src/lib/workers/gpx.worker.ts`: `onmessage` → `handleWorkerRequest` → `postMessage`. Module worker.
- `src/lib/workers/gpxWorkerClient.ts`: lazily constructs `new Worker(new URL('./gpx.worker.ts', import.meta.url), { type: 'module' })`; `runSimplify/runParse/runSerialize` return Promises (correlate by request id). **Fallback**: if `typeof Worker === 'undefined'` or construction throws (SSR/tests/old WebView), call `handleWorkerRequest` synchronously. Always resolve (never hang); reject→caller toasts.
- Commit `feat: add Web Worker + typed client (sync fallback)`.

### B3: wire heavy ops through the worker (debounced)
- **Reduce** (`tools/reduce`): move the `simplifyRdp` + serialize size-estimate off the main thread via the client; debounce the accuracy slider (see C1) so it doesn't recompute per pixel. Show a brief "calculating…" state while pending. Resolves the Phase 4/5 `TODO(phase7)`.
- **Import** (`FileService` or the import call sites): for parsing, route through the worker client (`runParse`) so large file parse doesn't block the UI; keep the sync fallback. (If passing bytes to a worker is awkward, parsing GPX text via worker is the priority; FIT bytes can stay sync if simpler — implementer's call, note it.)
- **Elevation** (`tools/elevation`): debounce the smoothing slider (the repair+smooth recompute); worker offload optional.
- Commit `feat: offload simplify/parse to worker, debounce sliders`.

## Part C — Robustness

### C1: debounce util (TDD)
- `src/lib/domain/usecases/debounce.ts` (or `src/lib/util/`): a small `debounce(fn, ms)` with cancel, **injectable timer** for tests (or use Vitest fake timers). TDD: only the last call within the window runs; cancel works. (If placed outside the coverage `include`, add its dir to include so it's measured.)
- Apply to reduce/elevation sliders.
- Commit `feat: add debounce util + apply to heavy sliders`.

### C2: robustness sweep
- Confirm every import/parse/export path is wrapped and surfaces errors via toast (no uncaught). Add a guard for very large tracks (e.g. simplify/compare handle 100k points without hanging — worker keeps UI alive). Verify no screen crashes when a track lacks the needed data (no sensors for compare metric, no elevation for elevation tool, single-point tracks).
- Commit `test: robustness sweep (large tracks, missing data)`.

## Verification gate
- `npm run test:coverage` → pass + ≥90% (compare, worker protocol, debounce all tested).
- `npm run check` 0/0; `npm run build` ok (confirm the worker chunk is emitted); `git status` clean.

## Self-review
- Spec §5 worker (non-blocking heavy ops) ✓; §8 robustness ✓; Compare tracks real ✓ (last tool; Soon pill removed).
- Testing rule: pure compare/protocol/debounce unit-tested; worker wiring validated by build + emulator (UI responsive). 
- Type consistency: `compareTracks/extractSeries`, `handleWorkerRequest`, client `runParse/runSimplify/runSerialize`, `debounce` signatures consistent across worker/usecases/screens.
- After this phase: all 6 tools real, ads live, FIT import, offloaded heavy work. Remaining real-world to-dos are the user's: real AdMob IDs, optional SRTM/Mapbox elevation, optional FIT export, store listing assets.
