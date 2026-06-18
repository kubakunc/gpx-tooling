import { test, expect } from '@playwright/test';
import { importViaPicker } from './helpers';

test.describe('files', () => {
  test('Files lists imported files and can remove them', async ({ page }) => {
    await page.goto('/files');
    await expect(page.getByText('No files yet')).toBeVisible();

    await importViaPicker(
      page,
      () => page.getByTestId('import-button').click(),
      'ride-a.gpx',
      'ride-b.gpx'
    );

    const rows = page.getByTestId('file-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('ride-a.gpx');
    await expect(rows.nth(0)).toContainText('km');

    // Remove the first file.
    await rows.nth(0).getByRole('button', { name: 'Remove file' }).click();
    await expect(page.getByTestId('file-row')).toHaveCount(1);
    await expect(page.getByTestId('file-row').nth(0)).toContainText('ride-b.gpx');
  });
});
