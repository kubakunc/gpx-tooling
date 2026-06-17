# Phase 2: Soft Sticker UI Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Recreate the "Soft Sticker" design pixel-faithfully as the app's UI shell — light theme, hub + 6 tool detail screens + Files/Settings, real OSM maps, English copy, mock data — on top of the Phase 1 SvelteKit scaffold.

**Architecture:** SvelteKit static SPA (`ssr=false`). Bottom-bar nav (Menu/Files/Settings) + ad-banner strip live in a shared `(tabs)` layout. Reusable presentational components in `src/lib/components/`; per-tool colors in `src/lib/toolThemes.ts`. Maps via Leaflet + OSM tiles.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, Tailwind, Leaflet, `@fontsource/plus-jakarta-sans`.

**References:**
- Spec: `docs/superpowers/specs/2026-06-17-soft-sticker-ui-design.md`
- Design (authoritative, recreate faithfully): `docs/design/GPX-Suite-Soft-Sticker.html`

---

## Important framing for the implementer
The design HTML is the **exact visual spec** — exact hex colors, radii, paddings, font sizes, shadows, SVG paths, and the Leaflet map config (`<script type="text/x-dc">` at the bottom) are all there. Read it in full and match it. **Drop the mockup chrome**: the outer `#e7e5df` canvas, the 56px padding, the side-by-side flex of 7 phones, each phone's bezel (`border-radius:46px;box-shadow:0 0 0 11px ...`), the fake "9:41 ▮▮▮ ◔ ⬤" status bar row, and the "A · …" section labels. Each real screen = the **inner content** of one phone div, filling the WebView, with the bottom nav + ad banner fixed at the bottom. **Translate all Polish copy to English** per the mapping below.

### Polish → English copy mapping
- Header: "Narzędzia" → **Tools**; badge "GP" stays.
- Tiles: Scal pliki/"Połącz w jeden ślad" → **Merge files / Combine into one track**; Przytnij ślad/"Utnij zakres na mapie" → **Trim track / Cut range on the map**; Konwertuj/"GPX · FIT · TCX · KML" → **Convert / GPX · FIT · TCX · KML**; Korekta wys./"Popraw profil i przewyższenie" → **Elevation fix / Fix profile & total gain**; Redukcja/"Zmniejsz rozmiar pliku" → **Reduce points / Shrink file size**; Porównaj ślady/"Zestaw 2 pliki na wykresie" → **Compare tracks / Chart two files together**.
- "Powiązana aplikacja" → **Related app**; "Eksport z Strava i Komoot"/"Pobierz ślady GPX z Twoich kont · osobna apka" → **Export from Strava & Komoot / Pull GPX tracks from your accounts · separate app**.
- Bottom bar: Menu/Pliki/Ustawienia → **Menu / Files / Settings**.
- Breadcrumb "Narzędzia /" → **Tools /**.
- Merge: "Trasa po scaleniu" → **Merged route**; "3 pliki · przeciągnij" → **3 files · drag to reorder**; "＋ Dodaj" → **＋ Add**; button "Scal i eksportuj" → **Merge & export**.
- Trim: "Zachowany odcinek" → **Kept segment**; legend zostaje/wycięte → **kept / cut**; Początek/Zostaje/Koniec → **Start / Kept / End**; button "Przytnij i zapisz" → **Trim & save**.
- Convert: "Z formatu/Na format" → **From / To**; "Format docelowy" → **Target format**; "Zachowaj dane" → **Keep data**; "Dane z czujników" → **Sensor data**; "Znaczniki czasu" → **Timestamps**; "Punkty trasy (waypoints)" → **Waypoints**; button → **Convert → ride_morning.tcx**.
- Elevation: "Surowy GPS/Po korekcie" → **Raw GPS / Corrected**; "Przewyższenie przed" → **Gain before**; "Źródło wysokości" → **Elevation source**; "Wygładzanie"/"Średnie" → **Smoothing / Medium**; button "Zastosuj korektę" → **Apply correction**.
- Reduce: "Trasa zachowana" → **Kept route**; legend oryginał/uproszczona → **original / simplified**; Punkty/Rozmiar → **Points / Size**; "Dokładność"/"Wysoka · 73%" → **Accuracy / High · 73%**; "Mniejszy plik"/"Wierność trasie" → **Smaller file / Track fidelity**; "Zachowaj wysokość i czas" → **Keep elevation & time**; button "Zredukuj i zapisz" → **Reduce & save**.
- Compare: tabs Moc/Tętno/Kadencja → **Power / Heart rate / Cadence**; "Przesuń assioma.fit" → **Shift assioma.fit**; helper "Wyrównaj sygnały, gdy urządzenia startowały w różnym momencie" → **Align signals when devices started at different times**; "Śr. moc A/B"/"Różnica" → **Avg power A / Avg power B / Difference**; button "Zapisz porównanie" → **Save comparison**.

---

## File structure (created/modified this phase)
```
Modify: package.json (add leaflet, @types/leaflet, @fontsource/plus-jakarta-sans)
Modify: tailwind.config.ts (light neutral tokens), src/app.css (font import + light bg), src/app.html (drop dark class)
Create: src/lib/toolThemes.ts
Create: src/lib/components/{BottomNav,AdBanner,ToolHeader,ToolTile,RouteMap,Toggle,Slider}.svelte
Modify: src/routes/+page.svelte (remove old redirect)  — hub becomes (tabs) index
Replace: src/routes/(tabs)/+layout.svelte (bottom nav + ad banner shell)
Create: src/routes/(tabs)/+page.svelte (Hub)
Create: src/routes/(tabs)/files/+page.svelte, src/routes/(tabs)/settings/+page.svelte
Remove: src/routes/(tabs)/merge, src/routes/(tabs)/trim  (old placeholders)
Create: src/routes/(tabs)/tools/{merge,trim,convert,elevation,reduce,compare}/+page.svelte
Create/Modify: tests under src/lib for toolThemes + any pure helpers
```

---

### Task 1: Dependencies + light theme foundation
- [ ] **Step 1:** Add deps to `package.json` dependencies: `"leaflet": "^1.9.4"`, `"@fontsource/plus-jakarta-sans": "^5.1.0"`; devDependencies: `"@types/leaflet": "^1.9.12"`. Run `npm install`.
- [ ] **Step 2:** `src/app.css` — import the font (`@fontsource/plus-jakarta-sans/400.css` … `800.css`), set base `font-family:'Plus Jakarta Sans',sans-serif`, body bg `#fcfbf9`, text `#1c1917`. Keep `@tailwind` directives.
- [ ] **Step 3:** `tailwind.config.ts` — replace dark tokens with neutral Soft-Sticker tokens: `screen:#fcfbf9`, `ink:#1c1917`, `ink-muted:#5a5f66`, `ink-faint:#a8a29e`, `line:#efece6`, `ad:#f4f1eb`. Set `fontFamily.sans` to Plus Jakarta Sans. Remove `darkMode:'class'` reliance (or keep but default light).
- [ ] **Step 4:** `src/app.html` — remove `class="dark"` from `<html>`, set `<meta name="theme-color" content="#fcfbf9">`, body bg light.
- [ ] **Step 5:** `npm run check` (0 errors) and `npm run build` succeed. Commit: `chore: add leaflet + jakarta font, switch to light soft-sticker theme`.

### Task 2: `toolThemes.ts` + unit test
- [ ] **Step 1 (TDD):** Write `src/lib/toolThemes.test.ts` asserting each tool key (`merge,trim,convert,elevation,reduce,compare`) exists and has the exact hex values from the spec (`tile,icon,title,subtitle,button`), e.g. `expect(toolThemes.merge.button).toBe('#059669')`.
- [ ] **Step 2:** Run test → fails (module missing).
- [ ] **Step 3:** Create `src/lib/toolThemes.ts` exporting a typed `toolThemes` record matching the spec's per-tool palette + the cyan `relatedApp` set.
- [ ] **Step 4:** Run test → passes. `npm run check`. Commit: `feat: add toolThemes color source of truth + tests`.

### Task 3: Shared components
- [ ] **Step 1:** Build `AdBanner.svelte` (50px strip, bg `#f4f1eb`, centered "AD · Adaptive Banner", muted) and `BottomNav.svelte` (66px, three items Menu/Files/Settings with the design's glyphs `▦ 🗂 ⚙`, active item dark `#1c1917`, inactive `#b0aaa2`; active determined from `$app/state` `page.url.pathname` — Menu active on `/` and `/tools/*`, Files on `/files`, Settings on `/settings`). Use `<a href>` for nav.
- [ ] **Step 2:** Build `ToolHeader.svelte` (props: `title`, optional `accentTitleColor`): back chevron tile (`#f1efe9`), "Tools /" faint breadcrumb, bold title. Back uses `history.back()` or links to `/`.
- [ ] **Step 3:** Build `ToolTile.svelte` (props: `href,icon,tile,iconBg,title,titleColor,subtitle,subtitleColor`): faithful tile from hub grid.
- [ ] **Step 4:** Build `Toggle.svelte` (props: `on`, `accent`) and `Slider.svelte` (props: `percent`, `accent`, optional `trackBg`) — presentational, matching the design's switch and slider knob.
- [ ] **Step 5:** `npm run check`. Commit: `feat: add shared soft-sticker UI components`.

### Task 4: RouteMap (Leaflet) component
- [ ] **Step 1:** Build `src/lib/components/RouteMap.svelte` (props: `variant: 'merge'|'trim'|'reduce'`, `mapId`). On `onMount`, import `leaflet` + `leaflet/dist/leaflet.css`; init a static map (options from the design: `zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, touchZoom:false, tap:false`), OSM tile layer with attribution, then add polylines per the design's `support.js` for the variant (merge: white casing + 3 emerald segments + end dots; trim: faded dashed full + white casing + blue kept + handles dots; reduce: purple original + simplified w/ vertex dots). Reuse the exact `route` coords array from the design. `invalidateSize()` + `fitBounds(..., {padding:[22,22]})` after a short delay. Guard against double-init.
- [ ] **Step 2:** `npm run check` + `npm run build` (confirm Leaflet bundles for static output). Commit: `feat: add Leaflet OSM RouteMap component`.

### Task 5: Hub + Files + Settings + layout
- [ ] **Step 1:** Replace `src/routes/(tabs)/+layout.svelte` with the shell: a flex column — scrollable `<main>` (padding-bottom to clear nav+ad = 116px) + fixed `BottomNav` + `AdBanner`. Import `app.css` stays in root layout.
- [ ] **Step 2:** Remove old `src/routes/(tabs)/merge` and `src/routes/(tabs)/trim` dirs. Change `src/routes/+page.svelte` to redirect to `/` is unnecessary — instead make the Hub the `(tabs)` index: create `src/routes/(tabs)/+page.svelte`. Delete the root redirect `src/routes/+page.svelte` if it conflicts (the `(tabs)` group index serves `/`).
- [ ] **Step 3:** Build the **Hub** `(tabs)/+page.svelte`: header ("GPX Suite" faint label + "Tools" title + "GP" badge), 2-col grid of 6 `ToolTile`s (data from `toolThemes` + copy), then "Related app" divider + cyan Export card with ↗ affordance. Each tile links to `/tools/<key>`.
- [ ] **Step 4:** Build `(tabs)/files/+page.svelte` and `(tabs)/settings/+page.svelte` as simple titled placeholders in the soft-sticker style (header like the hub; short muted "Coming soon" copy). Settings notes future GDPR consent link.
- [ ] **Step 5:** `npm run check` + `npm run build`. Commit: `feat: add hub, files, settings screens + nav shell`.

### Task 6: Tool detail screens (merge, trim, reduce — with maps)
- [ ] **Step 1:** `(tabs)/tools/merge/+page.svelte` — `ToolHeader` "Merge files"; `RouteMap variant="merge"` with the "Merged route" + 49.2 km/+1057 m overlay; "3 files · drag to reorder" + "＋ Add"; three file rows (exact metas from design); fixed primary button "Merge & export" (emerald). Match spacing to the design.
- [ ] **Step 2:** `(tabs)/tools/trim/+page.svelte` — file chip; `RouteMap variant="trim"` ("Kept segment" + legend); the elevation scrubber SVG (copy the exact paths + gradient + two handles); Start/Kept/End stat row; buttons "Trim & save" (blue) + reset `↺`.
- [ ] **Step 3:** `(tabs)/tools/reduce/+page.svelte` — `RouteMap variant="reduce"` ("Kept route" + legend); Points/Size stat cards (8 412 → 2 240, 1.8 MB → 0.5 MB); `Slider` "Accuracy · High · 73%" + caption row; `Toggle` "Keep elevation & time" (on); button "Reduce & save" (purple).
- [ ] **Step 4:** `npm run check` + `npm run build`. Commit: `feat: add merge/trim/reduce tool screens`.

### Task 7: Tool detail screens (convert, elevation, compare)
- [ ] **Step 1:** `(tabs)/tools/convert/+page.svelte` — From GPX → To TCX cards; format chips GPX/FIT/TCX(selected)/KML; "Keep data" rows with `Toggle` (Sensor data on, Timestamps on, Waypoints off); button "Convert → ride_morning.tcx" (pink `#be185d`).
- [ ] **Step 2:** `(tabs)/tools/elevation/+page.svelte` — before/after profile card (copy the exact SVG paths + gradient, dashed raw vs solid amber); "Gain before 1057 m" strikethrough → "Corrected 1042 m"; source chips GPS/SRTM(selected)/Mapbox; `Slider` "Smoothing · Medium" (55%); button "Apply correction" (amber `#b45309`).
- [ ] **Step 3:** `(tabs)/tools/compare/+page.svelte` — two file chips (indigo/amber); metric tabs Power(selected)/Heart rate/Cadence; overlaid line chart SVG (copy both paths + gridlines + time axis); "Shift assioma.fit" stepper (−/+, "+2.4 s") + `Slider` + helper; Avg power A/B/Difference stat row; buttons "Save comparison" (indigo `#4f46e5`) + reset.
- [ ] **Step 4:** `npm run check` + `npm run build`. Commit: `feat: add convert/elevation/compare tool screens`.

### Task 8: Verification gate
- [ ] **Step 1:** `npm test` — all tests pass (toolThemes + Phase 1 smoke).
- [ ] **Step 2:** `npm run check` — 0 errors, 0 warnings.
- [ ] **Step 3:** `npm run build` — succeeds; `build/index.html` exists.
- [ ] **Step 4:** Confirm no leftover Polish strings in `src/routes`/`src/lib`: `grep -rniE "Narzędzia|Scal|Przytnij|Konwertuj|Redukcja|Porównaj|Ustawienia|Pliki|zapisz|eksportuj" src/` returns nothing.
- [ ] **Step 5:** Commit any remaining changes: `test: phase 2 verification green`.

---

## Self-Review
- **Spec coverage:** all 7 screens (hub + 6 tools) + Files/Settings + nav + ad banner + maps + English copy + light theme + toolThemes → Tasks 1–7. ✓
- **Coverage rule:** This phase is presentational; the only non-trivial pure logic is `toolThemes` (tested in Task 2) and the RouteMap layer config (visual, asserted by build + emulator screenshot, not unit-tested). The ≥90% coverage rule applies to logic phases (engine/stores) — flag explicitly that UI components here are validated by build + manual/emulator review, not unit coverage.
- **Placeholder scan:** "Coming soon" on Files/Settings is intentional per "visual shell, logic later" scope, not a plan gap.
- **Type consistency:** tool keys `merge,trim,convert,elevation,reduce,compare` consistent across `toolThemes.ts`, hub tiles, and `/tools/<key>` routes; `RouteMap` variant union matches the three map screens.
