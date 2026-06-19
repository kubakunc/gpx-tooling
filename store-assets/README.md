# Play Store assets

Generated from the Claude Design "GPX Suite - Store Assets" file.

- `feature-graphic-a.png` / `feature-graphic-b.png` — Feature graphic, 1024×500 (two options).
- `marketing-screenshot.png` — Lead marketing screenshot, 1080×1920.
- `play-icon-512.png` — Play Store listing icon, 512×512 (real app artwork).

Regenerate the graphics: `node store-assets/render.mjs` (uses the Playwright Chromium).
App screenshots (Merge/Repair/Trim/etc.) are captured from the running app, not here.

## App screenshots (gallery)
`screenshots/01-hub.png` … `13-settings.png` (hub + all 10 tools + Files + Settings) — 1170×2340 (2:1), captured from the real
built app via Playwright (`node store-assets/screenshots.mjs`, needs `npm run preview` running),
using the synthetic demo rides in `fixtures/` (no personal data; regenerate with
`node store-assets/fixtures/gen.mjs`).
