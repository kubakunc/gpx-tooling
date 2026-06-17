import { test, expect } from '@playwright/test';
import { importViaPicker } from './helpers';

test.describe('trim', () => {
  test('import → profile + map render → move range slider → kept stats update → save', async ({
    page
  }) => {
    await page.goto('/tools/trim');
    await expect(page.getByText('No file loaded')).toBeVisible();

    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    // Elevation profile (SVG polyline) and the map container both render.
    await expect(page.locator('svg polyline').first()).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Kept label before adjusting (the "Keep" stat under the sliders).
    const keepStat = page.getByTestId('keep-stat');
    const before = await keepStat.textContent();

    // Move the End slider left to keep less of the track.
    const endSlider = page.getByRole('slider').nth(1);
    await endSlider.focus();
    for (let i = 0; i < 20; i++) await endSlider.press('ArrowLeft');

    await expect(keepStat).not.toHaveText(before ?? '');

    // Save triggers a download.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Trim & save' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.gpx$/);
  });
});
