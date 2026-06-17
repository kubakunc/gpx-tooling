import { test, expect } from '@playwright/test';
import { importViaPicker } from './helpers';

test.describe('elevation', () => {
  test('import → before/after gain shown → smoothing changes after value → apply', async ({
    page
  }) => {
    await page.goto('/tools/elevation');
    await expect(page.getByText('No file loaded')).toBeVisible();

    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    const before = page.getByTestId('gain-before');
    const after = page.getByTestId('gain-after');
    await expect(before).toContainText('m');
    // Wait for the debounced recompute to land (no "…" placeholder).
    await expect(after).not.toHaveText('…');
    const afterStart = await after.textContent();

    // Crank smoothing to "Strong" — the corrected gain should change.
    const slider = page.getByRole('slider');
    await slider.focus();
    for (let i = 0; i < 45; i++) await slider.press('ArrowRight');
    await expect(after).not.toHaveText('…');
    await expect(after).not.toHaveText(afterStart ?? '');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Apply correction' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.gpx$/);
  });
});
