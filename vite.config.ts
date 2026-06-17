import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/domain/**',
        'src/lib/data/**',
        'src/lib/stores/**',
        'src/lib/ads/**',
        'src/lib/workers/**',
        'src/lib/util/**'
      ],
      // The worker entry is a thin shell over the pure (tested) dispatcher and
      // can only run inside a real Worker context, so it is exercised by the
      // build, not unit tests.
      exclude: ['src/lib/workers/gpx.worker.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 }
    }
  }
});
