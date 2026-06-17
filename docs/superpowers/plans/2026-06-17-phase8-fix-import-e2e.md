# Phase 8: Fix Import (worker DOMParser) + Whole-UI E2E Tests

> REQUIRED: subagent-driven-development + TDD. ≥90% Vitest coverage gate stays green. Adds a Playwright E2E suite (separate runner; not part of the coverage gate). Three-stage review after.

## Part A — Fix the import bug (root cause CONFIRMED)

**Root cause:** Phase 7 (`a5cbcf7`) routed GPX text parsing through the Web Worker. `GpxParser.parseGpx` uses `new DOMParser()`, but a Web Worker global has **no `DOMParser`** (`typeof DOMParser === 'undefined'` outside a document). In the worker, parse throws `ReferenceError: DOMParser is not defined`; `handleWorkerRequest` catches it → `{ok:false}` → `runParse` throws → **every GPX import fails on device / in any real browser**. Vitest missed it because the client falls back to synchronous main-thread execution (no `Worker` in node) under happy-dom (which *has* `DOMParser`).

**Fix:** Parse on the main thread (where `DOMParser` exists). The worker keeps only DOM-free work (RDP simplify, serialize).

### A1: Failing regression tests first (TDD)
- `src/lib/workers/gpxWorkerProtocol.domless.test.ts` (default **node** env — NO `// @vitest-environment happy-dom`, so no `DOMParser`, mimicking a Worker): assert that `simplify` and `serialize` succeed without a DOM, and that **GPX parse is NOT a worker capability** (after the fix, `handleWorkerRequest({type:'parse',...})` returns `{ok:false}` / parse is removed). Write this to encode "the worker must not do DOM-dependent work."
- `src/lib/data/io/FileService.test.ts` (it uses happy-dom where appropriate): add a test that the DEFAULT `FileService` (no injected parser) imports a real GPX string end-to-end (picker mock returns base64 GPX `data`) and yields parsed points — proving import parses on the main thread with no worker dependency. This test, run with a real Worker absent, still must pass; the point is the default path no longer routes parse through the worker.
- Run them → they fail/are red against current code.

### A2: Implement the fix
- **Remove GPX parse from the worker**: delete `ParseRequest` + `ParseResultPayload` + the `parse` case in `handleWorkerRequest` (`gpxWorkerProtocol.ts`); remove `runParse` from `GpxWorkerClient` (`gpxWorkerClient.ts`). Worker handles only `simplify` + `serialize`. Update the existing worker-protocol/client tests (drop parse cases; keep simplify/serialize).
- **FileService parses on the main thread**: remove the `gpxWorkerClient` import; in `readAndParse`, parse directly via `importTrack(name, { text })` for GPX and `importTrack(name, { bytes })` for FIT (both main-thread; `importTrack`→`parseGpx` uses the WebView's `DOMParser`, →`parseFit` is pure). Keep `parseGpxText`/an injectable parser dep only if still useful for tests; default it to the main-thread `importTrack` path (NOT the worker).
- **Defense-in-depth (same import path):** in `readPickedText`/`readPickedBytes`, prefer the picker's already-read base64 `data` (guaranteed by `readData:true`) BEFORE falling back to `Filesystem.readFile(file.path)`. This avoids a likely second device failure where `Filesystem.readFile` chokes on the picker's content-URI/cache `path`. Order: `if (file.data) use data; else if (native && file.path) Filesystem.readFile(path)`.
- Run A1 tests → green. Run full `npm run test:coverage` → all pass, ≥90%.

### A3: Device verification
After the fix, deploy to the emulator, push a sample `.gpx` to the device, and import it through the picker — confirm the file loads (rows + stats) with no error toast. Capture evidence (screenshot). (This is the real-world proof the worker/DOMParser path is gone.)

---

## Part B — Whole-UI automated tests (Playwright E2E)

Set up Playwright E2E against the built SPA so the entire UI is exercised in a real browser (this class of test would have caught the import bug). E2E is a separate runner from Vitest; it does not affect the coverage gate.

### B1: Playwright setup
- Add devDep `@playwright/test`; `npx playwright install chromium`.
- `playwright.config.ts`: `testDir: 'e2e'`, `webServer: { command: 'npm run build && npm run preview', port: 4173, reuseExistingServer: !process.env.CI }`, `use: { baseURL: 'http://localhost:4173' }`, chromium project. (Confirm the actual `vite preview` port and set it.)
- Scripts: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`.
- `.gitignore`: add `test-results/`, `playwright-report/`, `/playwright/.cache/`.
- E2E fixtures: `e2e/fixtures/ride-a.gpx` and `e2e/fixtures/ride-b.gpx` (small valid GPX tracks with `<time>`, `<ele>`, and sensor extensions hr/cad/power so Compare/Elevation have data); both with overlapping timestamps for Compare.

### B2: E2E specs (cover the whole UI)
Write specs under `e2e/`:
- `navigation.spec.ts`: hub shows GPX Suite/Tools + 6 tiles + related card; each tile navigates to its tool and back; bottom nav Menu/Files/Settings switches routes; no console errors on any screen.
- `merge.spec.ts`: empty state → import (via `page.on('filechooser')` + `setInputFiles(ride-a, ride-b)`) → two file rows with real stats appear → reorder (↑/↓) → "Merge & export" enabled at ≥2 files (and disabled at <2); export triggers a download. **This is the import regression guard.**
- `trim.spec.ts`: import a file → elevation profile + map render → move a range slider → kept stats update → Trim & save.
- `reduce.spec.ts`: import → accuracy slider changes the before→after point count (worker simplify) → Reduce & save.
- `convert.spec.ts`: import → select TCX → "Saves as" shows `.tcx` → Convert; KML disables the sensor toggle.
- `elevation.spec.ts`: import → before/after gain shown → smoothing changes after value → Apply.
- `compare.spec.ts`: import two files → pick A/B → metric tabs → shift changes the Avg/Difference numbers → Export CSV.
- `files-settings.spec.ts`: Files lists imported files with remove; Settings shows the ads/consent section.
- Use resilient selectors (prefer `getByRole`/`getByText`); add `data-testid` attributes to key controls where text is ambiguous.

### B3: Make the suite green + stable
- Run `npm run test:e2e`; fix flakiness (await navigations/toasts, not arbitrary sleeps). On web, AdMob/consent are no-ops and the placeholder banner shows — ensure tests don't depend on native plugins. The file-picker on web uses an `<input type=file>`; drive it via the filechooser event.
- Document `npm run test:e2e` in the plan output.

---

## Verification gate
- `npm run test:coverage` → pass + ≥90% (unit).
- `npm run test:e2e` → all E2E specs pass (chromium).
- `npm run check` 0/0; `npm run build` ok; `git status` clean.
- Emulator: a real `.gpx` imports successfully (Part A3).

## Self-review
- Root-cause fix (not symptom): parse moved off the DOM-less worker; worker retains only DOM-free ops. Regression encoded at unit level + caught by E2E in a real browser.
- Defense-in-depth: prefer picker `data` over `Filesystem.readFile(path)`.
- Whole-UI E2E covers navigation + all 6 tools + Files/Settings + import flow.
- Out of scope: native-device E2E automation (manual emulator check covers the native path); FIT-file E2E (binary fixture) — optional.
