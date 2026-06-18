import { test, expect } from '@playwright/test';
import { importViaPicker } from './helpers';

// THE import regression guard: a real browser drives the web file picker via
// the filechooser event, exercising FileService → main-thread parse. If parsing
// were routed through a DOM-less worker again, the rows/stats would never appear.
test.describe('merge — import flow', () => {
  test('empty → import two files → rows with real stats → reorder → merge enabled', async ({
    page
  }) => {
    await page.goto('/tools/merge');

    // Empty state, with merge disabled (it isn't even rendered until files load).
    await expect(page.getByText('No files yet')).toBeVisible();
    await expect(page.getByTestId('merge-export')).toHaveCount(0);

    // Import both fixtures at once through the picker.
    await importViaPicker(
      page,
      () => page.getByTestId('import-button').click(),
      'ride-a.gpx',
      'ride-b.gpx'
    );

    // Two rows appear with parsed names and real (non-zero) stats.
    const rows = page.getByTestId('file-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('ride-a.gpx');
    await expect(rows.nth(1)).toContainText('ride-b.gpx');
    // Stats line shows km · gain · duration — proof points were really parsed.
    await expect(rows.nth(0)).toContainText('km');
    await expect(rows.nth(0)).toContainText('m');

    // Merge is enabled now that there are >= 2 files.
    const mergeBtn = page.getByTestId('merge-export');
    await expect(mergeBtn).toBeEnabled();

    // Reorder: move row 2 up; the first row should now be ride-b.
    await rows.nth(1).getByRole('button', { name: 'Move up' }).click();
    await expect(page.getByTestId('file-row').nth(0)).toContainText('ride-b.gpx');

    // Export triggers a browser download.
    const downloadPromise = page.waitForEvent('download');
    await mergeBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.gpx$/);
  });

  test('merge is disabled with a single file and enabled at two', async ({ page }) => {
    await page.goto('/tools/merge');
    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    await expect(page.getByTestId('file-row')).toHaveCount(1);
    await expect(page.getByTestId('merge-export')).toBeDisabled();
    await expect(page.getByText('Add another file to merge.')).toBeVisible();

    await importViaPicker(page, () => page.getByTestId('add-button').click(), 'ride-b.gpx');
    await expect(page.getByTestId('file-row')).toHaveCount(2);
    await expect(page.getByTestId('merge-export')).toBeEnabled();
  });
});

test.describe('merge v2 — analysis panel & segments', () => {
  test('analysis panel shows segments and points; sequential mode still exports', async ({
    page
  }) => {
    await page.goto('/tools/merge');
    await importViaPicker(
      page,
      () => page.getByTestId('import-button').click(),
      'ride-a.gpx',
      'ride-b.gpx'
    );

    // Live analysis panel renders with real stats.
    await expect(page.getByTestId('merge-analysis')).toBeVisible();
    await expect(page.getByTestId('merge-stat-segments')).toBeVisible();
    await expect(page.getByTestId('merge-stat-points')).toBeVisible();
    // Points should be the parsed total (6 + 6 = 12).
    await expect(page.getByTestId('merge-stat-points')).toHaveText('12');

    // Switch to Sequential and confirm export still works.
    await page.getByTestId('merge-mode-sequential').click();
    await expect(page.getByTestId('merge-mode-sequential')).toHaveAttribute('aria-pressed', 'true');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('merge-export').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.gpx$/);
  });

  test('a geographically gapped pair yields more than one segment', async ({ page }) => {
    await page.goto('/tools/merge');
    await importViaPicker(
      page,
      () => page.getByTestId('import-button').click(),
      'ride-a.gpx',
      'ride-far.gpx'
    );

    await expect(page.getByTestId('file-row')).toHaveCount(2);
    // The two tracks are ~140 km apart → at least 2 segments.
    const segCount = await page.getByTestId('merge-stat-segments').textContent();
    expect(Number(segCount)).toBeGreaterThanOrEqual(2);
    // A gap issue should be listed in the analysis panel.
    await expect(page.getByTestId('merge-issue').first()).toBeVisible();
  });
});
