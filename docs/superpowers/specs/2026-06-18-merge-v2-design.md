# Merge v2 — Design Spec

**Date:** 2026-06-18
**Status:** Approved
**Goal:** Turn Merge from a naive time-sort into a best-in-class merger: chronological/sequential modes, time-overlap detection + shift, geographic-gap & teleport segment splitting, duplicate removal, and a live pre-merge analysis panel — with multi-segment GPX output.

## Decisions (approved)
- Time overlap → **detect, warn, offer fixes** (one-tap "shift after previous" + manual nudge); never silently interleave conflicting points.
- Geographic gaps → **auto-split into separate `<trkseg>`** (default 100 m) with a **Force-continuous** toggle.
- Scope → **full** (modes + overlap + gap/teleport + dedupe + analysis panel).
- **Both** merge modes: Smart chronological (default) + Sequential (drag order, ignore time).

## Data model
- `TrackSegment = TrackPoint[]`.
- `MergeIssue = { kind: 'overlap' | 'gap' | 'teleport' | 'duplicate' | 'unordered'; message: string; fileIndex?: number; meters?: number; seconds?: number; speedKmh?: number; count?: number }`.
- `MergeResult = { segments: TrackPoint[][]; issues: MergeIssue[]; stats: { distanceM: number; gainM: number; durationS: number; points: number; segmentCount: number } }`.
- `MergeOptions = { mode: 'smart' | 'sequential'; gapMeters?: number /*100*/; forceContinuous?: boolean; maxSpeedMps?: number /*~42 ≈ 150 km/h*/; timeGapSeconds?: number /*optional*/; timeShiftSecondsByIndex?: Record<number, number> }`.
- The flat `TrackPoint[]` representation stays everywhere else (Trim/Reduce/Elevation/stats). Multi-segment is used only for merge output + GPX serialization.

## Engine — `src/lib/domain/usecases/mergeEngine.ts` (pure, fully tested)
`analyzeMerge(files: { name: string; points: TrackPoint[] }[], options: MergeOptions): MergeResult`, composed of small tested helpers:
1. **Order** —
   - *smart*: sort files ascending by their first timestamp; files with no timestamps are appended in given order. Apply per-file `timeShiftSecondsByIndex` (shift every point's `time`) BEFORE ordering.
   - *sequential*: keep the given file order; ignore timestamps for ordering.
2. **`detectTimeOverlaps(files)`** → overlap issues: for files ordered by start time, if `fileB.start < previousMax.end` they overlap (report `meters?`/`seconds` of overlap and the `fileIndex`). After applying shifts, re-check; only unresolved overlaps remain as issues. In *smart* mode without resolution, do NOT interleave conflicting points — keep each file's points contiguous in the chosen file order (sort points by time only *within* the already-ordered, non-overlapping stream).
3. **`dedupePoints(points)`** → drop a point that is coincident with its predecessor: identical `time`, OR (`<0.5 m` apart AND `<1 s` apart / both untimed). Count → `duplicate` issue.
4. **`splitIntoSegments(points, opts)`** → start a new segment at index i when, vs the previous kept point: `haversine > gapMeters` (→ `gap` issue, meters) OR (both timed) `speed > maxSpeedMps` (→ `teleport` issue, speedKmh) OR (`timeGapSeconds` set and `dt > timeGapSeconds`). `forceContinuous` → exactly one segment (no splits, no gap/teleport issues).
5. **Stats** — distance summed **within** each segment (cross-gap jumps excluded); gain via `elevationGainMeters` over all points; duration first→last timed point; points + segmentCount.

`GpxProcessor.merge(files, options?)` delegates to `analyzeMerge` and returns a `GpxFile` whose `points` is the flattened segments (back-compat), plus exposes the `MergeResult` for the UI.

## Serializer — `src/lib/data/serialization/GpxSerializer.ts`
Add `serializeGpxSegments(segments: TrackPoint[][], name: string): string` — one `<trk><name>…</name>` with one `<trkseg>` per segment, reusing the existing per-`trkpt` builder (ele/time/sensor extensions). `serializeGpx(points, name)` stays (single segment) for the other tools.

## UI — `src/routes/(tabs)/tools/merge/+page.svelte`
- **Mode** SegmentedControl: Smart chronological (default) / Sequential.
- **Force-continuous** toggle; show the gap threshold (default 100 m).
- **File rows**: a file overlapping the previous shows an inline "overlaps previous · Shift" one-tap fix (auto-shift to after previous) + a ± seconds nudge; reflects `timeShiftSecondsByIndex`.
- **Analysis panel** (live, `$derived` from `analyzeMerge`): distance · gain · duration · **segments** · points, then a list of `issues` (icon + message, e.g. "Gap 1.2 km between files → new segment", "device B overlapped A by 4:10 → shifted", "12 duplicate points removed", "Teleport 320 km/h → split").
- **Map**: `RouteMap` gains an optional `segments?: LatLon[][]`; merge passes the segment coords so gaps render as visible breaks (each segment its own polyline; no line drawn across a gap). Falls back to single `route` when absent.
- **Export**: `serializeGpxSegments(result.segments, name)`; keep the ≥2-file guard, busy/spinner, interstitial-after-export.

## Error handling
- <2 files → no merge (existing empty/encourage state). All pure code is total (no throws on empty/edge); the screen guards busy/errors and toasts on export failure.

## Testing (≥90% coverage kept)
- Unit (node, pure): smart vs sequential ordering; overlap detection + shift application (resolved vs unresolved); dedupe (timed + untimed); segment split at gap / teleport / time-gap / forceContinuous; per-segment stats exclude cross-gap distance; `serializeGpxSegments` round-trips via `parseGpx` to N segments' points and escapes the name.
- E2E: extend `merge.spec` — import two fixtures, assert the analysis panel renders (segments/points) and a gapped pair yields >1 segment; a Sequential-mode toggle changes order.

## Out of scope
Reversing a track; cross-format merge; editing individual points. Real-AdMob IDs etc. unchanged.
