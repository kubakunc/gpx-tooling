import { test, expect } from '@playwright/test';
import { trackConsoleErrors } from './helpers';

const TILES = [
  { title: 'Merge files', path: '/tools/merge', heading: 'Merge files' },
  { title: 'Trim track', path: '/tools/trim', heading: 'Trim track' },
  { title: 'Convert', path: '/tools/convert', heading: 'Convert format' },
  { title: 'Elevation fix', path: '/tools/elevation', heading: 'Elevation fix' },
  { title: 'Reduce points', path: '/tools/reduce', heading: 'Reduce points' },
  { title: 'Compare tracks', path: '/tools/compare', heading: 'Compare tracks' }
];

// Benign messages we don't want to fail navigation on (network tile fetches in
// CI sandboxes, favicon, etc.). Real app errors still fail the suite.
const IGNORE = [/tile\.openstreetmap/i, /favicon/i, /Failed to load resource/i];
function realErrors(errors: string[]): string[] {
  return errors.filter((e) => !IGNORE.some((re) => re.test(e)));
}

test.describe('navigation', () => {
  test('hub shows the suite header, all tiles and the related-app card', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('GPX Suite').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible();
    for (const tile of TILES) {
      await expect(page.getByRole('link', { name: new RegExp(tile.title, 'i') })).toBeVisible();
    }
    await expect(page.getByTestId('related-app')).toBeVisible();
    await expect(page.getByText('Get it on Google Play')).toBeVisible();
  });

  test('each tile navigates to its tool and back to the hub', async ({ page }) => {
    for (const tile of TILES) {
      await page.goto('/');
      await page.getByRole('link', { name: new RegExp(tile.title, 'i') }).click();
      await expect(page).toHaveURL(new RegExp(`${tile.path}$`));
      await expect(page.getByTestId('tool-title')).toHaveText(tile.heading);
      await page.getByRole('link', { name: 'Back' }).click();
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test('bottom nav switches between Menu, Files and Settings', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-files').click();
    await expect(page).toHaveURL(/\/files$/);
    await expect(page.getByRole('heading', { name: 'Files' })).toBeVisible();

    await page.getByTestId('nav-settings').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.getByTestId('nav-menu').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('no real console errors across every screen', async ({ page }) => {
    const getErrors = trackConsoleErrors(page);
    const routes = ['/', '/files', '/settings', ...TILES.map((t) => t.path)];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
    }
    expect(realErrors(getErrors())).toEqual([]);
  });
});
