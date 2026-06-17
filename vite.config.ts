import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/domain/**', 'src/lib/data/**', 'src/lib/stores/**', 'src/lib/ads/**'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 }
    }
  }
});
