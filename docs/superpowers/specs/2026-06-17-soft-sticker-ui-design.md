# Soft Sticker UI — Design Spec (Pivot)

**Date:** 2026-06-17
**Status:** Approved
**Supersedes:** the dark-3-tab UI in `2026-06-17-gpx-tooling-suite-design.md` (architecture/engine sections of that spec still hold; only the UI direction, navigation, theme, and feature set change here).
**Design reference (authoritative):** `docs/design/GPX-Suite-Soft-Sticker.html` (vendored Claude Design handoff). Recreate it pixel-faithfully; drop mockup chrome (phone bezel, fake "9:41" status bar, side-by-side phone canvas, section labels).

## Key decisions
- **Pivot fully** to the light "Soft Sticker" aesthetic. Replaces the dark sports theme and the 3-tab nav.
- **Build the full visual shell of all 7 screens** (hub + 6 tools) with mock/placeholder data. Real GPX logic wired in later phases.
- **Network allowed for maps + online elevation sources.** Core processing stays offline; OSM tiles and SRTM/Mapbox elevation may use the network.
- **App UI in English.** Translate the Polish design copy.

## Visual language
- Font: **Plus Jakarta Sans** (weights 400–800), bundled for offline via `@fontsource`.
- Screen background `#fcfbf9`; ink `#1c1917`; muted text `#5a5f66` / `#6b7077` / `#8a9099`; faint labels `#a8a29e`; hairlines `#efece6`.
- Large radii (tiles 18px, cards 16–22px, buttons 20px, phone-content corners are device-level — not in-app). Soft shadows (e.g. `0 8px 22px rgba(accent,.08–.1)`, buttons `0 12px 26px rgba(accent,.3)`).
- Uppercase tracked micro-labels (`letter-spacing:.12–.16em`).

### Per-tool accent palette (tile bg / icon / title / subtitle / primary button)
- **Merge** — emerald: `#ecfdf5` / `#10b981` / `#064e3b` / `#5b8c7d` / button `#059669`
- **Trim** — blue: `#eff6ff` / `#3b82f6` / `#1e3a8a` / `#6b8fc7` / button `#1d4ed8`
- **Convert** — pink: `#fdf2f8` / `#ec4899` / `#831843` / `#b06a8c` / button `#be185d`
- **Elevation fix** — amber: `#fef3c7` / `#f59e0b` / `#92400e` / `#b45309` / button `#b45309`
- **Reduce points** — purple: `#f3e8ff` / `#8b5cf6` / `#4c1d95` / `#8a6fc0` / button `#6d28d9`
- **Compare tracks** — indigo: `#eef2ff` / `#6366f1` / `#3730a3` / `#7c83c4` / button `#4f46e5`
- **Related app (Export from Strava & Komoot)** — cyan: bg `#ecfeff`, border `#cdf0f5`, icon `#06b6d4`, title `#155e75`, sub `#5b9aa8`

## Navigation & routes (real app, mockup chrome removed)
Bottom bar (fixed) with **Menu · Files · Settings**, and an **AD · Adaptive Banner** strip (`#f4f1eb`) below it on every screen. Content scrolls above, padded to clear both.

- `/` — **Hub (Menu)**: header "GPX Suite / Tools" + "GP" badge; 2-col grid of 6 tool tiles; "Related app" section with the cyan Export card (external-link affordance).
- `/files` — Files (placeholder for this phase).
- `/settings` — Settings (placeholder for this phase; later: calibration + GDPR consent re-open).
- `/tools/merge`, `/tools/trim`, `/tools/convert`, `/tools/elevation`, `/tools/reduce`, `/tools/compare` — tool detail screens. Each: back chevron + breadcrumb "Tools /" + title, tool-accent themed, primary action button. Maps on merge/trim/reduce.

## Screen contents (English copy; mock data from the design)
- **Hub** tiles: Merge files / "Combine into one track"; Trim track / "Cut range on the map"; Convert / "GPX · FIT · TCX · KML"; Elevation fix / "Fix profile & total gain"; Reduce points / "Shrink file size"; Compare tracks / "Chart two files together". Related: "Export from Strava & Komoot" / "Pull GPX tracks from your accounts · separate app".
- **Merge**: OSM map ("Merged route", 3 green segments, start/end dots, 49.2 km / +1057 m overlay); "3 files · drag to reorder" + "＋ Add"; 3 file rows (ride_morning.gpx, ride_afternoon.fit, climb_segment.gpx with metas, drag handle); button "Merge & export".
- **Trim**: file chip (ride_morning.gpx); OSM map ("Kept segment", faded full track + blue kept segment + two handles + legend kept/cut); elevation scrubber (SVG profile + shaded kept band + two drag handles); Start / Kept / End stats; buttons "Trim & save" + reset.
- **Convert**: From GPX → To (selected) card; target-format chips GPX/FIT/TCX/KML; "Keep data" toggles (Sensor data HR·CAD·PWR on, Timestamps on, Waypoints off); button "Convert → ride_morning.tcx".
- **Elevation fix**: before/after profile (raw GPS dashed vs corrected solid, amber); "Gain before 1057 m" (strikethrough) → "Corrected 1042 m"; source chips GPS/SRTM(selected)/Mapbox; "Smoothing · Medium" slider; button "Apply correction".
- **Reduce points**: OSM map ("Kept route", original vs simplified, legend); Points 8 412 → 2 240, Size 1.8 MB → 0.5 MB; "Accuracy · High · 73%" slider (Smaller file ↔ Track fidelity); "Keep elevation & time" toggle; button "Reduce & save".
- **Compare tracks**: two file chips (pioneer.fit indigo, assioma.fit amber); metric tabs Power(selected)/Heart rate/Cadence; overlaid line chart (two curves); "Shift assioma.fit" stepper (−/+, "+2.4 s") + slider + helper "Align signals when devices started at different times"; Avg power A / Avg power B / Difference stats; buttons "Save comparison" + reset.

## Component architecture (`src/lib/components/`)
- `BottomNav.svelte` — Menu/Files/Settings, active state by route.
- `AdBanner.svelte` — adaptive-banner placeholder strip.
- `ToolHeader.svelte` — back chevron + "Tools /" breadcrumb + title (accent-aware).
- `ToolTile.svelte` — hub tile (icon, colors, title, subtitle) → links to a tool route.
- `RouteMap.svelte` — Leaflet OSM map; static (no pan/zoom) per design; props select the variant (merge 3-segment / trim kept+cut / reduce original+simplified); ports the route coords + polyline layers from the design's `support.js`; OSM attribution kept (license).
- `Toggle.svelte` — pill switch (on/off + accent).
- `Slider.svelte` — track + filled portion + knob, accent-themed, with optional caption row.
- `StatCard.svelte` / `ElevationProfile.svelte` / `CompareChart.svelte` — small presentational SVG/stat helpers as needed.
- A `toolThemes.ts` map in `src/lib/` holding the per-tool color sets so tiles and detail screens share one source of truth.

## Tech notes
- Add deps: `leaflet` + `@types/leaflet`; `@fontsource/plus-jakarta-sans`.
- Leaflet init in `onMount` (SPA, `ssr=false`); import `leaflet/dist/leaflet.css`.
- Maps are presentational mock routes this phase; real GPX-driven maps come with the engine.
- Tailwind: switch to light; add neutral tokens; tool accents live in `toolThemes.ts` (and/or arbitrary values) to stay faithful without bloating the config.
- `app.html`: remove the `dark` class; light theme-color.

## Out of scope (this phase)
Real GPX/FIT parsing, real map data, working drag-reorder/sliders logic, ad SDK, file IO. This phase is the **visual shell + navigation + mock data** only. Functional wiring follows in later phases, each with its own spec→plan→review and ≥90% test coverage for logic.
