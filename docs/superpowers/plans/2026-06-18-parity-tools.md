# gpxfix-Parity Tools Implementation Plan

> REQUIRED: subagent-driven-development + TDD. ≥90% Vitest coverage gate stays green. Three-stage review (spec, code, UX) after. Repo identity `Jakub Kunc <kubakunc@gmail.com>`.

**Goal:** Build four client-side tools — Reverse, Strip/Minify, Time & speed, File repair — each as a hub tile + `/tools/<key>` screen + a pure tested engine module.

**Reference:** `docs/superpowers/specs/2026-06-18-parity-tools-design.md`. Reuse: `geo.haversineMeters`, `repairElevation`, `mergeEngine.{shiftPoints,dedupePoints}`, `stats`, `format` (unit-aware), `serializeGpx`, `FileService.{exportAndShare,saveToDevice}`, `ActiveFileSelector`, `SegmentedControl`, `Toggle`, `RouteMap`, `ToolHeader`, `Spinner`, `toolThemes`, `loadedFiles`, `editSession`, `settings`, `adManager`.

---

### Task 1: `reverse.ts` (TDD)
`src/lib/domain/usecases/reverse.ts` + `.test.ts`.
- `reverseTrack(points): TrackPoint[]`: reverse order; if all points timed → keep original `t0`, rebuild times from reversed gaps (forward, same duration); if any untimed → reverse geometry, all `time=null`. Non-mutating (clone points + sensors).
- Tests: 3 timed points → reversed lat order, times still ascending, same total duration, t0 preserved; mixed/untimed → times null; non-mutation; ≤1 point returns copy.
- Commit `feat: add reverseTrack`.

### Task 2: `strip.ts` (TDD)
`src/lib/domain/usecases/strip.ts` + `.test.ts`.
- `stripTrack(points, { sensors?, timestamps?, elevation? }): TrackPoint[]`: clear chosen fields (`sensors→{}`, `time→null`, `elevation→null`); non-mutating; default opts (all false) → unchanged copy.
- Tests: each flag independently clears only its field; combined; non-mutation.
- Commit `feat: add stripTrack`.

### Task 3: `timeTools.ts` (TDD)
`src/lib/domain/usecases/timeTools.ts` + `.test.ts`.
- `setStartTime(points, newStartMs)`: shift all timed points so first timed = newStartMs (preserve gaps); untimed unchanged; no timed points → copy.
- `shiftTimeSeconds(points, seconds)`: add seconds to every timed point (reuse `shiftPoints`).
- `removeStillTime(points, { minMoveMeters = 1 } = {})`: for consecutive timed points moving `< minMoveMeters`, subtract that gap's duration from all later timestamps; return `{ points, removedSeconds }`.
- Tests: setStartTime moves t0 and preserves the 2nd point's offset; shift ±; removeStillTime collapses a stationary gap (removedSeconds correct, geometry intact, later points shifted earlier); non-mutation.
- Commit `feat: add time tools (setStartTime, shiftTimeSeconds, removeStillTime)`.

### Task 4: `repairFile.ts` (TDD)
`src/lib/domain/usecases/repairFile.ts` + `.test.ts`.
- `type RepairStrength = 'conservative'|'balanced'|'aggressive'`; `MAX_SPEED_MPS = { conservative: 83, balanced: 42, aggressive: 28 }`; untimed distance thresholds `{ conservative:1000, balanced:300, aggressive:150 }`.
- `repairTrack(points, { strength }): { points, report: { invalid, spikes, duplicates, elevationFixed } }`. Pipeline per spec: drop invalid → sort by time → dedupe (reuse `dedupePoints`, count) → remove speed/distance outliers (count `spikes`) → elevation repair (balanced+aggressive via `repairElevation`, count changed) → aggressive 3-pt lat/lon smoothing. Non-mutating; total.
- Tests: drops an injected teleport spike (balanced) and counts it; conservative keeps a 120 km/h burst that balanced drops; invalid `(0,0)`/NaN/out-of-range dropped + counted; duplicates counted; elevation spike fixed in balanced not conservative; aggressive smooths jitter; non-mutation; empty input → empty + zero report.
- Commit `feat: add repairTrack (conservative/balanced/aggressive)`.

### Task 5: toolThemes + hub tiles
- Extend `src/lib/toolThemes.ts` with `reverse` (teal e.g. `#0d9488`), `strip` (slate `#475569`), `time` (orange `#ea580c`), `repair` (rose `#e11d48`) — each `{ tile, icon, title, subtitle, button }` (icon kept in the type for consistency even though tiles are text-only).
- `src/routes/(tabs)/+page.svelte`: add four tiles to the grid (text-only, current style): Reverse track / "Flip the route direction"; Strip & minify / "Remove data, shrink file"; Time & speed / "Fix start time & pauses"; Repair file / "Clean GPS spikes & errors". Update the `toolThemes.test.ts` to assert the new keys' hexes.
- Commit `feat: add hub tiles + themes for the four new tools`.

### Task 6: Reverse + Strip screens
- `tools/reverse/+page.svelte`: ActiveFileSelector (active file from `editSession`/first loaded), `RouteMap variant="merge"` showing the reversed route (`reverseTrack` → coords), primary "Reverse & export" (serializeGpx + exportAndShare) + "Save to device" (saveToDevice), empty state when no file, interstitial-after-export.
- `tools/strip/+page.svelte`: ActiveFileSelector, three `Toggle`s (Sensor data / Timestamps / Elevation), live before→after size (`serializeGpx` length → `formatBytes`), "Strip & export" + "Save to device".
- `npm run check` + `build`. Commit `feat: Reverse + Strip screens`.

### Task 7: Time & Repair screens
- `tools/time/+page.svelte`: ActiveFileSelector; a `datetime-local` input prefilled from the file's start (local), applied via `setStartTime`; a "Shift ±" stepper (± minutes/seconds) via `shiftTimeSeconds`; a "Remove still time" `Toggle` showing `removedSeconds` (`formatDuration`). Compose the transforms in order; "Apply & export" + "Save to device".
- `tools/repair/+page.svelte`: ActiveFileSelector; strength `SegmentedControl` (Conservative / Balanced[default] / Aggressive); run `repairTrack`; `RouteMap` of the cleaned route; a report line from `report` (e.g. "Removed 4 spikes · 2 invalid · 11 duplicates · 6 elevations fixed"); "Repair & export" + "Save to device".
- `npm run check` + `build`. Commit `feat: Time & Repair screens`.

### Task 8: E2E + verification gate
- Extend `e2e/`: a `parity-tools.spec.ts` — import `ride-a`, open each of the 4 new tools from the hub, exercise the primary control, assert an export download triggers (web). Add `data-testid`s used.
- `npm run test:coverage` (≥90%), `npm run test:e2e` (pass), `npm run check` (0/0), `npm run build`. `git status` clean.
- Commit `test(e2e): parity tools`.

---

## Self-Review
- Spec coverage: reverse (T1/T6), strip (T2/T6), time tools (T3/T7), repair w/ 3 strengths (T4/T7), hub+themes (T5), E2E (T8). ✓
- Strava intentionally NOT here (companion-app link already live).
- Type consistency: `reverseTrack`, `stripTrack`, `setStartTime`/`shiftTimeSeconds`/`removeStillTime`, `repairTrack`/`RepairStrength`, new `toolThemes` keys + `/tools/<key>` routes consistent across tasks.
- Coverage: all engine logic in `domain/usecases` (in coverage include); screens build/E2E-verified.
- Reuse over duplication: `shiftPoints`/`dedupePoints` from `mergeEngine`, `repairElevation`, `haversineMeters`, unit-aware `format`.
