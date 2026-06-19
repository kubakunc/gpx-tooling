// Play Store app screenshots from the real built app (vite preview) via Playwright.
// Imports the e2e GPX fixtures ONCE, then navigates client-side (so the in-memory
// loadedFiles store persists) and screenshots each tool with real data + maps.
//   npm run build && (npm run preview &)   then:  node store-assets/screenshots.mjs
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(dir, '..');
const BASE = 'http://localhost:4173';
const fixtures = [join(root, 'store-assets/fixtures/demo-a.gpx'), join(root, 'store-assets/fixtures/demo-b.gpx')];

const VP = { width: 390, height: 780 }; // @dsf3 → 1170x2340 (2:1, valid Play ratio)
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 3 });
const page = await ctx.newPage();

async function settle(ms = 1500) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}
async function shot(name) {
  await page.screenshot({ path: join(dir, 'screenshots', name), clip: { x: 0, y: 0, ...VP } });
  console.log('shot', name);
}
const toHub = () => page.locator('a[href="/"]').first().click();
const toTool = (name) => page.getByRole('link', { name: new RegExp(name, 'i') }).first().click();

// One full load on Merge, then import (populates the shared store for all tools).
await page.goto(`${BASE}/tools/merge`);
await settle(500);
await page.addStyleTag({ content: '.bg-ad{display:none!important}' }); // hide ad placeholder
await page.getByTestId('import-button').waitFor({ state: 'visible', timeout: 15000 });
const chooser = page.waitForEvent('filechooser', { timeout: 15000 });
await page.getByTestId('import-button').click();
(await chooser).setFiles(fixtures);
await page.waitForTimeout(1800);
await settle();
await shot('02-merge.png');

// From here, navigate ONLY client-side so the loaded files survive.
await toHub(); await settle(700); await shot('01-hub.png');

// Every tool (the merge shot above is 02). map-bearing tools get longer settle.
const tools = [
  ['Trim track', '03-trim.png'],
  ['Convert', '04-convert.png'],
  ['Elevation fix', '05-elevation.png'],
  ['Reduce points', '06-reduce.png'],
  ['Compare tracks', '07-compare.png'],
  ['Reverse track', '08-reverse.png'],
  ['Strip & minify', '09-strip.png'],
  ['Time & speed', '10-time.png'],
  ['Repair file', '11-repair.png']
];
for (const [name, file] of tools) {
  await toTool(name); await settle(); await shot(file);
  await toHub(); await settle(500);
}

// Files + Settings via the top-right menu (client-side).
const openMenu = () => page.getByTestId('nav-toggle').click();
await openMenu(); await page.getByTestId('nav-files').click(); await settle(700); await shot('12-files.png');
await toHub(); await settle(400);
await openMenu(); await page.getByTestId('nav-settings').click(); await settle(600); await shot('13-settings.png');

await browser.close();
console.log('done');
