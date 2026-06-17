import { test, expect } from '@playwright/test';
import { importViaPicker } from './helpers';

test.describe('reduce', () => {
  test('import → accuracy slider changes the before→after count (worker simplify) → save', async ({
    page
  }) => {
    await page.goto('/tools/reduce');
    await expect(page.getByText('No file loaded')).toBeVisible();

    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    const pointsStat = page.getByTestId('points-stat');
    // Wait for the initial worker recompute to settle (no "calculating…").
    await expect(pointsStat).not.toContainText('calculating');
    const before = await pointsStat.textContent();
    expect(before).toContain('→');

    // Drag the "Detail kept" slider toward "Smaller file" (fewer points kept).
    const slider = page.getByRole('slider');
    await slider.focus();
    for (let i = 0; i < 40; i++) await slider.press('ArrowLeft');

    await expect(pointsStat).not.toContainText('calculating');
    await expect(pointsStat).not.toHaveText(before ?? '');

    // Reduce & save downloads the simplified file.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Reduce & save' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.gpx$/);
  });
});
