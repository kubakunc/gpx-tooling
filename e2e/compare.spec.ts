import { test, expect } from '@playwright/test';
import { importViaPicker } from './helpers';

// Compare has no own import button (it reads files already loaded in the shared
// store). Import via the Merge tool, then SPA-navigate (which preserves the
// store) to Compare via the hub.
async function importTwoThenOpenCompare(page: import('@playwright/test').Page) {
  await page.goto('/tools/merge');
  await importViaPicker(
    page,
    () => page.getByTestId('import-button').click(),
    'ride-a.gpx',
    'ride-b.gpx'
  );
  await expect(page.getByTestId('file-row')).toHaveCount(2);
  // Back to hub, then into Compare — client-side nav keeps the loaded files.
  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByRole('link', { name: /Compare tracks/i }).click();
  await expect(page).toHaveURL(/\/tools\/compare$/);
}

test.describe('compare', () => {
  test('two files → A/B selected → metric tabs → shift changes stats → export CSV', async ({
    page
  }) => {
    await importTwoThenOpenCompare(page);

    // A and B selectors default to the two files.
    await expect(page.getByLabel('Track A')).toHaveValue(/ride-a\.gpx/);
    await expect(page.getByLabel('Track B')).toHaveValue(/ride-b\.gpx/);

    // Default metric (Power) has data: Avg A/B are numeric, not em-dash.
    const avgA = page.getByTestId('avg-a');
    await expect(avgA).toContainText('W');
    const diff = page.getByTestId('diff');
    const diffBefore = await diff.textContent();

    // Switch to the Heart rate metric tab — units change to bpm.
    await page.getByRole('button', { name: 'Heart rate' }).click();
    await expect(page.getByTestId('avg-a')).toContainText('bpm');

    // Back to Power, then shift B; the Difference should change.
    await page.getByRole('button', { name: 'Power' }).click();
    await expect(page.getByTestId('avg-a')).toContainText('W');
    const shift = page.getByLabel('Shift seconds');
    await shift.focus();
    for (let i = 0; i < 30; i++) await shift.press('ArrowRight');
    await expect(diff).not.toHaveText(diffBefore ?? '');

    // Share CSV download (web fallback for the share action).
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('compare-share').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    // Save also writes the CSV (web fallback is a download).
    const savePromise = page.waitForEvent('download');
    await page.getByTestId('compare-save').click();
    expect((await savePromise).suggestedFilename()).toMatch(/\.csv$/);
  });
});
