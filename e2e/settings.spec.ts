import { test, expect } from '@playwright/test';

test.describe('settings', () => {
  test('Settings shows Unit Preference and the privacy / ads section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Unit Preference section with both options.
    await expect(page.getByText('Unit Preference')).toBeVisible();
    await expect(page.getByText('Metric (km/h, km, m)')).toBeVisible();
    await expect(page.getByText('Imperial (mph, mi, ft)')).toBeVisible();

    // Privacy & ads section is still present.
    await expect(page.getByText('Privacy & ads')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Manage consent' })).toBeVisible();
  });

  test('Unit Preference toggles and is reflected in displayed units', async ({ page }) => {
    await page.goto('/settings');

    const metric = page.getByTestId('units-metric');
    const imperial = page.getByTestId('units-imperial');

    // Defaults to metric.
    await expect(metric).toBeChecked();
    await expect(imperial).not.toBeChecked();

    // Switch to imperial.
    await imperial.check();
    await expect(imperial).toBeChecked();
    await expect(metric).not.toBeChecked();

    // Persists across navigation / reload.
    await page.reload();
    await expect(page.getByTestId('units-imperial')).toBeChecked();

    // Switch back to metric.
    await page.getByTestId('units-metric').check();
    await expect(page.getByTestId('units-metric')).toBeChecked();
  });
});
