# GPX Tooling Suite — Architecture Design

**Date:** 2026-06-17
**Status:** Approved (full-architecture spec; implement Step 1 / scaffold first)
**App ID:** `com.velologiclabs.gpxtools` (VeloLogic Labs)

## 1. Overview

Offline-first, permanently-free, ad-supported cross-platform app packaged as a
native Android app (Google Play AAB) via Capacitor 6. It processes, merges,
trims, and repairs GPS GPX/FIT files for cyclists, runners, and hikers. **All
computation runs client-side** in the WebView; the network is used only for ads.

There is **NO premium tier, NO in-app purchases, and NO ad-removal option** —
ads are always active and the app must never contain ad-free state handling.

### Tech stack

- **Framework:** SvelteKit with `@sveltejs/adapter-static` (SPA mode, prerender disabled)
- **Language:** TypeScript (strict, 100%)
- **Native shell:** Capacitor 6 (Android target, Play AAB-ready)
- **Build:** Vite
- **Styling:** Tailwind CSS (dark sports aesthetic, Strava/Komoot-like) + Material-inspired components
- **GPS engine:** Pure-TS — DOMParser for GPX, custom binary decoder for FIT (no heavy parsing libs)
- **State:** Svelte stores (no external state lib)
- **Ads:** `@capacitor-community/admob` + Google UMP consent flow (GDPR)
- **Native plugins:** `@capacitor/filesystem`, `@capacitor/share`, `@capawesome/capacitor-file-picker`

## 2. Layered architecture (hexagonal-lite)

The GPS maths is pure, testable, and fully decoupled from Capacitor/DOM/UI.

```
src/lib/
├── domain/              ← PURE. No DOM, no Capacitor, no Svelte. Fully unit-tested.
│   ├── entities/        TrackPoint, Sensors, GpxFile, errors (ParseError)
│   └── usecases/        merge.ts, trim.ts, simplify.ts (RDP),
│                        repairElevation.ts, stats.ts (haversine dist, gain, speed series)
├── data/                ← IO + format adapters (touches DOMParser / binary / plugins)
│   ├── parsing/         GpxParser.ts, FitParser.ts, TrackImporter.ts (interface + dispatch)
│   ├── serialization/   GpxSerializer.ts
│   ├── io/              FileService.ts (file-picker + filesystem + share)
│   └── GpxProcessor.ts  ← facade orchestrating parse→process→serialize (public API)
├── ads/                 AdManager.ts (singleton, store-backed)
├── stores/              files, editSession, settings, toast
├── workers/             gpx.worker.ts + typed wrapper (heavy RDP/parse off main thread)
└── components/          BottomTabs, AdBanner, Snackbar, RangeSlider, ElevationChart, FileList
```

**Rationale:** every algorithm (RDP, merge, trim, repair, stats) lives in
`domain/` as a pure function — tested without a browser, runs unchanged inside
the Web Worker, never imports a plugin. `data/` adapts the messy outside world
(XML, binary FIT, native file IO) into clean `TrackPoint[]`.

### Unit responsibilities

- **`domain/entities`** — data shapes only; no behavior beyond constructors/guards.
- **`domain/usecases`** — pure functions, input `TrackPoint[]` → output `TrackPoint[]`/stats. Deterministic, side-effect free.
- **`data/parsing`** — adapt external formats into `GpxFile`. Each parser owns one format.
- **`data/serialization`** — `TrackPoint[]` → GPX XML string.
- **`data/io/FileService`** — the only module that imports native file plugins.
- **`data/GpxProcessor`** — orchestration facade; the surface the UI/stores call.
- **`ads/AdManager`** — the only module that imports AdMob/UMP.
- **`stores`** — reactive app state; no heavy logic.
- **`workers`** — thin shell delegating to pure `domain` functions.

## 3. The format seam (FIT = "both")

`TrackImporter` is the single import entry point. It sniffs extension /
magic-bytes and dispatches:

- `.gpx` → `GpxParser` (WebView `DOMParser`)
- `.fit` → `FitParser` (custom pure-TS **binary** decoder: header → definition
  messages → data messages; record messages decoded to lat/long via semicircles,
  altitude, timestamp, hr/cadence/power)

Both normalize to the **same** `GpxFile` / `TrackPoint[]`, so the rest of the
pipeline is format-agnostic.

**Export is GPX-only** (FIT write-back is explicitly out of scope; FIT is
import-only). Confirmed decision.

### Core entity

```ts
interface Sensors { hr?: number; cadence?: number; power?: number }
interface TrackPoint {
  latitude: number;
  longitude: number;
  elevation: number | null;
  time: Date | null;
  sensors: Sensors;
}
interface GpxFile { name: string; points: TrackPoint[]; /* + parsed metadata */ }
```

## 4. GpxProcessor responsibilities (Step 2)

- **Parser:** GPX XML string → `TrackPoint[]` (via `GpxParser`/DOMParser).
- **Chronological merger:** merge multiple files into one `<trk>`, sorting all
  `<trkpt>` by `<time>`, preserving sensor metadata.
- **Trimmer:** `trimGpx(points, startRatio, endRatio)` — cut from start/end by 0–1 ratios.
- **Simplification (RDP):** Ramer–Douglas–Peucker; keep point Pᵢ only if its
  perpendicular distance `d` from the simplified segment exceeds user epsilon (`d > ε`).
- **Elevation repair:** detect and smooth sudden spikes (altitude jump > 100 m in < 1 s).
- **Serializer:** `TrackPoint[]` → valid GPX XML.

## 5. Data flow

- **Import:** FilePicker → read bytes/text → `TrackImporter` → `GpxFile` → `files` store
- **Merge tab:** select + drag-reorder → `GpxProcessor.merge` → distance/elevation
  preview → serialize → `FileService` save/share → `showInterstitialIfReady`
- **Trim tab:** load → stats/series in worker → range slider [0–1] → `trimGpx` →
  optional RDP + elevation repair → serialize → save/share → interstitial

## 6. Advertising (Step 3)

`+layout` bootstraps `AdManager` on first launch:

1. **GDPR consent:** run UMP consent flow before initializing ads.
2. **AdMob init:** initialize safely after consent.
3. **Adaptive banner:** reusable Svelte component, bottom-anchored, on all screens.
4. **Interstitial pre-caching:** preload asynchronously as soon as the user starts editing a file.
5. **Safe trigger:** `showInterstitialIfReady(onDismissed)` — only after a
   successful save/export, never mid-edit; **3-minute frequency cap**.

No ad-free state anywhere. Settings tab can re-open the UMP consent form.

## 7. Interface (Step 4)

- **Bottom tab navigation (3 tabs):**
  - **Merge:** import multiple files, drag-reorder, preview total distance/elevation, merge.
  - **Trim:** load a file, elevation/speed graphs, range slider to cut dangling ends.
  - **Settings:** calibration values, privacy/consent links (re-open GDPR form).
- **File picker:** `@capawesome/capacitor-file-picker` for `.gpx` and `.fit`.
- **Export/share:** `@capacitor/share` + `@capacitor/filesystem` (Garmin Connect, Strava, Komoot).
- **Feedback:** Snackbar/toast for errors and success states.

## 8. Error handling & robustness (Step 5)

- All parse/IO wrapped in try-catch → typed `ParseError` → `toast` store → `Snackbar`.
- Malformed GPX/FIT fails gracefully, never crashes.
- Heavy RDP/parse runs in the Web Worker; algorithms are pure `domain` functions,
  so the worker is a thin shell and logic is tested directly.

## 9. Configuration

- `svelte.config.js`: `adapter-static`, `fallback: 'index.html'`.
- root `+layout.ts`: `export const ssr = false; export const prerender = false;`
- `capacitor.config.ts`: `appId: 'com.velologiclabs.gpxtools'`, `webDir: 'build'`.
- `tsconfig` strict; Tailwind dark sports theme; Vitest.
- **Scripts:** `build` → `vite build` · `sync` → `cap sync android` ·
  `android:add` (one-time) → `cap add android`.

## 10. Testing (Vitest)

- GPX round-trip (parse → serialize → parse).
- RDP correctness + performance benchmark.
- Merge ordering; trim boundaries; elevation repair.
- FIT decoder vs known binary fixtures.

## 11. Implementation phasing

Full design now; build Step 1 first. Each phase runs its own
**spec → plan → implement → code review** cycle.

1. **Scaffold + config + deps** ← current deliverable, then stop.
2. Domain entities + `GpxProcessor` (GPX parse/serialize/merge/trim/RDP/repair) + tests.
3. FIT binary decoder behind `TrackImporter` + fixtures.
4. Stores + UI (tabs, file IO, charts, slider, drag).
5. AdManager + consent + banner + interstitial.
6. Worker offloading + robustness pass.
