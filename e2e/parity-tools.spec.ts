import { test, expect } from '@playwright/test';
import { importViaPicker } from './helpers';

// Smoke-tests the four gpxfix-parity tools: open from an empty state, import a
// file, exercise the primary control, and assert an export download fires (web).
test.describe('parity tools', () => {
  test('hub lists the four new tiles', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Reverse track')).toBeVisible();
    await expect(page.getByText('Strip & minify')).toBeVisible();
    await expect(page.getByText('Time & speed')).toBeVisible();
    await expect(page.getByText('Repair file')).toBeVisible();
  });

  test('reverse: import → reversed route → export downloads', async ({ page }) => {
    await page.goto('/tools/reverse');
    await expect(page.getByText('No file loaded')).toBeVisible();
    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    await expect(page.getByText('Reversed route')).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('reverse-export').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/reversed\.gpx$/);
  });

  test('strip: toggles change the before→after size → export downloads', async ({ page }) => {
    await page.goto('/tools/strip');
    await expect(page.getByText('No file loaded')).toBeVisible();
    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    const size = page.getByTestId('strip-size');
    await expect(size).toContainText('→');
    const before = await size.textContent();
    // Strip elevation too — the after-size should drop further.
    await page.getByTestId('strip-toggle-elevation').click();
    await expect(size).not.toHaveText(before ?? '');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('strip-export').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/stripped\.gpx$/);
  });

  test('time: shift stepper + remove-still → export downloads', async ({ page }) => {
    await page.goto('/tools/time');
    await expect(page.getByText('No file loaded')).toBeVisible();
    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    // Start-time input prefilled from the timed fixture.
    await expect(page.getByTestId('time-start-input')).not.toHaveValue('');
    await page.getByTestId('time-shift-plus').click();
    await expect(page.getByTestId('time-shift-value')).toContainText('1:00');
    await page.getByTestId('time-remove-still').click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('time-export').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/retimed\.gpx$/);
  });

  test('repair: strength control + report → export downloads', async ({ page }) => {
    await page.goto('/tools/repair');
    await expect(page.getByText('No file loaded')).toBeVisible();
    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    await expect(page.getByText('Cleaned route')).toBeVisible();
    await expect(page.getByTestId('repair-report')).toContainText('spikes');
    // Balanced is the default; switch to Aggressive.
    await page.getByTestId('repair-strength-aggressive').click();
    await expect(page.getByTestId('repair-strength-aggressive')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('repair-export').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/repaired\.gpx$/);
  });
});
