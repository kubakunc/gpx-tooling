# gpxfix-Parity Tools — Design Spec

**Date:** 2026-06-18
**Status:** Approved
**Goal:** Add four client-side tools to close gaps vs gpxfix.eu: **Reverse track**, **Strip / Minify**, **Time & speed tools**, **File repair (Fix)**. Strava = handled via the existing companion-app link (no new work). No waypoints / point-editor / restore tools.

Each tool = a new hub tile + a `/tools/<key>` screen following the established pattern (ToolHeader, `ActiveFileSelector`, options, optional `RouteMap`, primary action → `serializeGpx`/`serializeGpxSegments` + `exportAndShare` & `saveToDevice`, interstitial-after-export, `$settings.units` for any displayed stats). All engine logic is pure + unit-tested (≥90% gate).

## Engine modules (pure, `src/lib/domain/usecases/`)

### reverse.ts
`reverseTrack(points: TrackPoint[]): TrackPoint[]`
- Reverse point order (sensors & elevation travel with their points).
- Timestamps: if **every** point is timed, keep the original first timestamp `t0` and rebuild forward timestamps from the **reversed inter-point gaps** (valid increasing times, same total duration). If any point is untimed, return geometry reversed with all `time` set to `null` (a reversed track can't keep decreasing times). Non-mutating.

### strip.ts
`stripTrack(points: TrackPoint[], opts: { sensors?: boolean; timestamps?: boolean; elevation?: boolean }): TrackPoint[]`
- Return points with chosen fields cleared: `sensors → {}`, `time → null`, `elevation → null`. Non-mutating. (Metadata/waypoints aren't modelled, so not offered.)
- UI shows before→after byte estimate via `serializeGpx` length + `formatBytes`.

### timeTools.ts (pure)
- `setStartTime(points, newStartMs: number): TrackPoint[]` — shift all timed points so the first timed point equals `newStartMs`, preserving all gaps. Untimed points unchanged.
- `shiftTimeSeconds(points, seconds: number): TrackPoint[]` — add `seconds` to every timed point (reuse the existing `shiftPoints` from mergeEngine, or re-export). 
- `removeStillTime(points, opts?: { minMoveMeters?: number }): { points: TrackPoint[]; removedSeconds: number }` — find consecutive timed points whose movement `< minMoveMeters` (default 1 m); treat that gap's duration as a pause and **compress it out** by subtracting it from all subsequent timestamps. Returns cleaned points (same geometry) + total seconds removed. Non-mutating.

### repairFile.ts (pure)
`type RepairStrength = 'conservative' | 'balanced' | 'aggressive'`
`repairTrack(points, opts: { strength: RepairStrength }): { points: TrackPoint[]; report: { invalidРemovedExample } }` →
return `{ points, report: { invalid: number; spikes: number; duplicates: number; elevationFixed: number } }`.
Pipeline (order matters):
1. **Drop invalid points** (all strengths): non-finite lat/lon, `|lat|>90`, `|lon|>180`, exact `(0,0)`.
2. **Sort by time** (timed points ascending; untimed keep order).
3. **Dedupe** coincident points (reuse `dedupePoints`).
4. **Remove GPS spikes / teleports** — for consecutive timed points, drop a point whose implied speed exceeds `maxSpeedMps` by strength: conservative ≈ 83 m/s (300 km/h), balanced ≈ 42 m/s (150 km/h), aggressive ≈ 28 m/s (100 km/h). When untimed, use a distance threshold (conservative 1000 m / balanced 300 m / aggressive 150 m between neighbours) to drop clear outliers.
5. **Elevation spike repair** — balanced + aggressive run the existing `repairElevation`; conservative skips it. Count points whose elevation changed.
6. **Aggressive only:** light 3-point moving-average smoothing of lat/lon to reduce jitter (centered, endpoints unchanged).
Report counts feed a small result summary in the UI. Non-mutating; total (never throws).

## Screens (`src/routes/(tabs)/tools/<key>/+page.svelte`)
New keys + accent colors (extend `toolThemes`): `reverse` (teal), `strip` (slate), `time` (orange-ish, distinct from elevation), `repair` (red/rose — "fix"). Hub tiles added (text-only, matching the current icon-less style) under the existing grid.
- **reverse**: ActiveFileSelector → map preview (reversed route) → "Reverse & save"/export.
- **strip**: ActiveFileSelector → three toggles (Sensor data / Timestamps / Elevation) → before→after size → "Strip & save"/export.
- **time**: ActiveFileSelector → start-time input (datetime-local) + "Shift ±" stepper + "Remove still time" toggle (shows seconds removed) → "Apply & save"/export.
- **repair**: ActiveFileSelector → strength SegmentedControl (Conservative / **Balanced** default / Aggressive) → map (cleaned route) + a report ("Removed 4 spikes, 2 invalid, 11 duplicates; fixed 6 elevations") → "Repair & save"/export.
All export via `exportAndShare` AND offer "Save to device" (`saveToDevice`), like Merge.

## Testing
- Unit-test every engine function (both strengths/branches, untimed/edge cases, non-mutation). ≥90% coverage gate.
- Extend E2E lightly: import a file, open each new tool, run it, assert an export download triggers. Add `data-testid`s.

## Out of scope
Waypoints, point/coordinate editor, restore-from-reference, Strava OAuth (handled via companion-app link), distance faking.
