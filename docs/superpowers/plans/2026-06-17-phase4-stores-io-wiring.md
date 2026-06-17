# Phase 4: Stores + File IO + Engine Wiring Implementation Plan

> REQUIRED SUB-SKILL: subagent-driven-development + TDD. ≥90% coverage gate stays green (now also covering `src/lib/stores/**` and `src/lib/data/io/**`).

**Goal:** Make the core tools work on real files. Add Svelte stores + a `FileService` (import via file-picker, export via filesystem+share), a toast/snackbar, and wire the **Merge / Trim / Reduce** screens to operate on real parsed `TrackPoint[]` using the Phase 3 engine.

**Architecture:** Stores hold app state (loaded files, edit session, settings, toasts). `FileService` (the only module importing Capacitor IO plugins) bridges native IO ↔ the pure engine. Screens become reactive: read stores, call `GpxProcessor`, export results. `RouteMap` gains an optional real-route prop.

**Tech Stack:** Svelte 5 stores, Capacitor (`@capawesome/capacitor-file-picker`, `@capacitor/filesystem`, `@capacitor/share`), Vitest (mock the plugins).

**References:** spec `docs/superpowers/specs/2026-06-17-gpx-tooling-suite-design.md` (§7 UI, §8 robustness); the Soft Sticker screens already exist with mock data.

---

## Design decisions
- **LoadedFile** = `{ id: string; name: string; points: TrackPoint[] }`. `id` from a module-scoped incrementing counter (no `Math.random`) e.g. `f${++counter}-${name}`.
- **Stores** (`src/lib/stores/`):
  - `loadedFiles.ts` — `writable<LoadedFile[]>` + actions `addFiles(GpxFile[])`, `removeFile(id)`, `reorderFiles(from,to)`, `clear()`. Actions are pure functions over the array (exported separately for unit testing, e.g. `applyReorder(arr,from,to)`).
  - `editSession.ts` — `writable<{ fileId: string|null; startRatio:number; endRatio:number; epsilon:number }>` with defaults `{null,0,1,10}` + setters.
  - `toast.ts` — `writable<Toast[]>` (`Toast={id:number;message:string;kind:'success'|'error'|'info'}`) + `showToast(message,kind)`; auto-dismiss after 3.5s (caller-injectable timer for tests).
  - `settings.ts` — `writable<Settings>` (`{ consentObtained:boolean; smoothing:'low'|'medium'|'high' }`), persisted to `localStorage` behind guards (no-op if unavailable). Pure `loadSettings(raw)`/`serializeSettings(s)` helpers for tests.
- **FileService** (`src/lib/data/io/FileService.ts`) — async methods, all wrapped in try/catch that throw `ParseError`/`Error` with friendly messages (callers toast):
  - `pickAndImportGpx(): Promise<GpxFile[]>` — `FilePicker.pickFiles({ types:['application/gpx+xml'], readData:true })` (also accept `.gpx` by extension); for each picked file read text (web: `data` is base64 → decode; native: read `path` via `Filesystem.readFile`), `parseGpx(text, name)`. Skip/Collect per-file errors; if all fail, throw.
  - `exportAndShare(xml:string, filename:string): Promise<void>` — native: `Filesystem.writeFile({path:filename, data:xml, directory:Directory.Cache, encoding:Encoding.UTF8})` → `getUri` → `Share.share({title,url})`. Web fallback: trigger a Blob download. Guard with `Capacitor.isNativePlatform()`.
  - Pure helpers extracted + tested: `decodeBase64Utf8(b64)`, `ensureGpxExt(name)`, `friendlyImportError(e)`.
- **RouteMap** gains optional props: `route?: LatLon[]`, `keptRange?: [number,number]` (trim), `simplified?: LatLon[]` (reduce). When `route` is provided, draw real coords per variant; else fall back to the existing demo route so unwired states still look right.
- **Mapping accuracy slider → epsilon:** `epsilon = round( (1 - percent/100) * MAX_EPS )` with `MAX_EPS=50` (higher accuracy% → smaller epsilon → more points kept). Document in code.

## Coverage
Extend `vite.config.ts` coverage `include` to add `src/lib/stores/**` and keep `src/lib/data/**`. Thresholds stay 90% (global aggregate). Mock `@capacitor*`/`@capawesome*` in `FileService.test.ts` via `vi.mock`. UI `.svelte` files are validated by build + emulator, not unit coverage (Svelte components aren't in the coverage `include`).

---

### Task 1: Toast store + Snackbar component
- TDD `toast.test.ts`: `showToast` appends a toast with incrementing id + kind; `dismissToast(id)` removes it. Then `toast.ts`.
- Build `src/lib/components/Snackbar.svelte` subscribing to the toast store (stacked, color by kind: success emerald, error rose, info slate), rendered in `(tabs)/+layout.svelte` above the bottom nav.
- `npm run check`. Commit `feat: add toast store + Snackbar`.

### Task 2: loadedFiles + editSession + settings stores (TDD)
- TDD pure helpers: `applyReorder(arr,from,to)` (moves item, clamps indices), `addFiles`/`removeFile`/`clear` semantics; `loadSettings`/`serializeSettings` round-trip; editSession setters clamp ratios to [0,1] and start<end.
- Implement the three stores. localStorage access guarded (try/catch, `typeof localStorage`).
- `npm run check`. Commit `feat: add loadedFiles/editSession/settings stores + tests`.

### Task 3: FileService (TDD with mocked plugins)
- TDD `FileService.test.ts` (`vi.mock('@capawesome/capacitor-file-picker')`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/core`): 
  - `decodeBase64Utf8` decodes UTF-8 correctly; `ensureGpxExt('ride')→'ride.gpx'`, leaves `'ride.gpx'`; `friendlyImportError` maps ParseError→message.
  - `pickAndImportGpx` returns parsed GpxFile[] from mocked picker data; throws when all picks fail.
  - `exportAndShare` (native mock) calls writeFile→getUri→share with the filename; (web mock) takes the download path.
- Implement `FileService.ts`.
- `npm run check`. Commit `feat: add FileService (import/export) + tests`.

### Task 4: RouteMap real-route support
- Extend `RouteMap.svelte` props (`route`, `keptRange`, `simplified`) as above; when present, draw from real coords; else demo route. Keep static, attribution, cleanup.
- `npm run check` + `npm run build`. Commit `feat: RouteMap accepts real route data`.

### Task 5: Wire Merge screen
- `/tools/merge`: subscribe to `loadedFiles`. Empty state (no files): centered "Import GPX files" `<button>` → `FileService.pickAndImportGpx()` → `addFiles` (toast count or error). With files: real rows (name + `totalDistanceMeters`/`elevationGainMeters`/`durationSeconds` formatted), reorder via drag-handle (HTML5 DnD or up/down — functional over fancy), "＋ Add" imports more, map shows merged route via `mergeChronologically`. "Merge & export" → merge → `serializeGpx` → `exportAndShare('merged.gpx')` → success toast. Keep the emerald styling.
- `npm run check` + `npm run build`. Commit `feat: wire Merge screen to engine + file IO`.

### Task 6: Wire Trim + Reduce screens
- `/tools/trim`: if a file is loaded (editSession.fileId or first loadedFile, else prompt import), render the real elevation profile (build the SVG polyline from `points` elevations) and the map with `keptRange` from `startRatio/endRatio`; two sliders/handles update ratios; Start/Kept/End stats computed from real points + `trimGpx`. "Trim & save" → `trimGpx` → serialize → export.
- `/tools/reduce`: real file; accuracy slider → epsilon (mapping above); show real Points before→after (`points.length`→`simplifyRdp(...).length`) and Size estimate (bytes of serialized before/after); map shows original + simplified; "Reduce & save" → simplify → serialize → export.
- `npm run check` + `npm run build`. Commit `feat: wire Trim + Reduce screens to engine`.

### Task 7: Verification gate
- `npm run test:coverage` → pass + ≥90% (domain+data+stores).
- `npm run check` 0/0; `npm run build` ok; `git status` clean after coverage.
- Commit any added tests.

---

## Self-Review
- Spec coverage: stores (loaded files/edit/settings/toast) ✓; file picker import ✓; export/share ✓; snackbar ✓; Merge/Trim/Reduce operate on real data ✓.
- Testing rule: pure store helpers + FileService logic unit-tested with mocks; ≥90% gate extended to stores. UI screens build+emulator-verified (noted).
- Out of scope (later phases): FIT import, Convert/Compare/Elevation real logic, AdManager, Web Worker.
- Type consistency: `LoadedFile`, `GpxFile`, `TrackPoint`, store action names, `FileService` method names consistent across stores/screens/tests.
- Note: full import/export can't be driven headlessly on the emulator (system file dialog); emulator verification confirms screens render + empty states + no crashes; the IO logic is covered by mocked unit tests.
