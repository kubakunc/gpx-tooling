// Renders the Play Store graphics (from the Claude Design "Store Assets" file)
// to exact-size PNGs using the project's Playwright Chromium.
//   node store-assets/render.mjs
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const jobs = [
  { file: 'feature-a.html', w: 1024, h: 500, out: 'feature-graphic-a.png' },
  { file: 'feature-b.html', w: 1024, h: 500, out: 'feature-graphic-b.png' },
  { file: 'screenshot.html', w: 1080, h: 1920, out: 'marketing-screenshot.png' }
];

const browser = await chromium.launch();
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
  await page.goto('file://' + join(dir, 'src', j.file));
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(dir, j.out), clip: { x: 0, y: 0, width: j.w, height: j.h } });
  await page.close();
  console.log('rendered', j.out, `${j.w}x${j.h}`);
}
await browser.close();
