import { test, expect } from '@playwright/test';
import { importViaPicker } from './helpers';

test.describe('convert', () => {
  test('import → select TCX → "Saves as" shows .tcx → convert downloads', async ({ page }) => {
    await page.goto('/tools/convert');
    await expect(page.getByText('No file loaded')).toBeVisible();

    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    // Default target is TCX; the "Saves as" line reflects the chosen extension.
    await page.getByRole('button', { name: 'TCX', exact: true }).click();
    await expect(page.getByText(/Saves as:/)).toContainText('.tcx');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Convert format' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.tcx$/);
  });

  test('KML disables the sensor toggle', async ({ page }) => {
    await page.goto('/tools/convert');
    await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');

    // With sensor data present, the toggle is enabled for GPX/TCX.
    const sensorToggle = page.getByRole('button', { name: /Sensor data/ });
    await page.getByRole('button', { name: 'GPX', exact: true }).click();
    await expect(sensorToggle).toBeEnabled();

    // Selecting KML disables it (KML can't store sensor data).
    await page.getByRole('button', { name: 'KML', exact: true }).click();
    await expect(sensorToggle).toBeDisabled();
    await expect(page.getByText("KML can't store sensor data.")).toBeVisible();
    await expect(page.getByText(/Saves as:/)).toContainText('.kml');
  });
});
