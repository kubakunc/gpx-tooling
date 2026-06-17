import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Page } from '@playwright/test';

const FIXTURE_DIR = fileURLToPath(new URL('./fixtures/', import.meta.url));

/** Absolute path to a fixture under e2e/fixtures. */
export function fixture(name: string): string {
  return path.join(FIXTURE_DIR, name);
}

/**
 * Drive the app's web file picker. The picker (@capawesome/capacitor-file-picker
 * web impl) creates a hidden `<input type=file>` and calls `.click()`, which
 * raises Playwright's `filechooser` event. We answer it with the given fixtures.
 *
 * Usage: register the chooser, THEN perform the click that triggers the picker.
 *   await importViaPicker(page, () => page.getByTestId('import-button').click(), 'ride-a.gpx');
 */
export async function importViaPicker(
  page: Page,
  trigger: () => Promise<void>,
  ...files: string[]
): Promise<void> {
  const chooserPromise = page.waitForEvent('filechooser');
  await trigger();
  const chooser = await chooserPromise;
  await chooser.setFiles(files.map(fixture));
}

/** Collect console errors for a page; returns a getter for assertions. */
export function trackConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return () => errors;
}
