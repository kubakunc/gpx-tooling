# Phase 1: Scaffold + Config + Dependencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a clean SvelteKit project configured as a static SPA for Capacitor 6, with the full `lib/` directory skeleton, dark Tailwind theme, Vitest wired, and an Android-ready Capacitor config — so later phases drop algorithm/UI/ads code into a working shell.

**Architecture:** SvelteKit + `adapter-static` (SPA, `fallback: index.html`, prerender/SSR off) so the whole app is client-side inside the Capacitor WebView. Hexagonal-lite `src/lib/` layout (`domain` / `data` / `ads` / `stores` / `workers` / `components`) is created as stubs now to lock boundaries. Capacitor `webDir: build`.

**Tech Stack:** SvelteKit, TypeScript (strict), Vite, `@sveltejs/adapter-static`, Tailwind CSS, Vitest, Capacitor 6, AdMob + UMP, `@capacitor/filesystem`, `@capacitor/share`, `@capawesome/capacitor-file-picker`.

**Reference:** `docs/superpowers/specs/2026-06-17-gpx-tooling-suite-design.md`

---

## File Structure (created in this phase)

```
package.json, svelte.config.js, vite.config.ts, tsconfig.json
tailwind.config.ts, postcss.config.js, capacitor.config.ts, .npmrc
src/app.html, src/app.css, src/app.d.ts
src/routes/+layout.ts, src/routes/+layout.svelte, src/routes/+page.svelte
src/routes/(tabs)/+layout.svelte
src/routes/(tabs)/merge/+page.svelte
src/routes/(tabs)/trim/+page.svelte
src/routes/(tabs)/settings/+page.svelte
src/lib/domain/entities/.gitkeep, src/lib/domain/usecases/.gitkeep
src/lib/data/parsing/.gitkeep, src/lib/data/serialization/.gitkeep, src/lib/data/io/.gitkeep
src/lib/ads/.gitkeep, src/lib/stores/.gitkeep
src/lib/workers/.gitkeep, src/lib/components/.gitkeep
src/lib/index.test.ts (smoke test)
static/.gitkeep
```

---

### Task 1: package.json + dependencies

**Files:**
- Create: `package.json`
- Create: `.npmrc`

- [ ] **Step 1: Create `.npmrc`**

```
engine-strict=false
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "gpx-tooling-suite",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "sync": "cap sync android",
    "android:add": "cap add android",
    "android": "npm run build && cap sync android"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.6",
    "@sveltejs/kit": "^2.8.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "svelte": "^5.1.0",
    "svelte-check": "^4.0.0",
    "tailwindcss": "^3.4.14",
    "tslib": "^2.8.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "@capacitor/android": "^6.1.2",
    "@capacitor/cli": "^6.1.2",
    "@capacitor/core": "^6.1.2",
    "@capacitor/filesystem": "^6.0.1",
    "@capacitor/share": "^6.0.2",
    "@capawesome/capacitor-file-picker": "^6.1.0",
    "@capacitor-community/admob": "^6.0.0"
  }
}
```

- [ ] **Step 3: Install**

Run: `npm install`
Expected: completes, creates `node_modules/` and `package-lock.json` (peer-dep warnings are acceptable).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .npmrc
git commit -m "chore: add package.json and dependency manifest"
```

---

### Task 2: TypeScript + SvelteKit static SPA config

**Files:**
- Create: `tsconfig.json`
- Create: `svelte.config.js`
- Create: `src/app.d.ts`

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

- [ ] **Step 2: Create `svelte.config.js`**

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: true
    })
  }
};

export default config;
```

- [ ] **Step 3: Create `src/app.d.ts`**

```ts
// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
```

- [ ] **Step 4: Sync SvelteKit (generates `.svelte-kit/tsconfig.json`)**

Run: `npx svelte-kit sync`
Expected: completes with no error; creates `.svelte-kit/`.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json svelte.config.js src/app.d.ts
git commit -m "chore: configure TypeScript and SvelteKit static SPA"
```

---

### Task 3: Vite + Vitest config

**Files:**
- Create: `vite.config.ts`

- [ ] **Step 1: Create `vite.config.ts`**

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'node'
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "chore: add Vite and Vitest config"
```

---

### Task 4: Tailwind dark sports theme

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/app.css`

- [ ] **Step 1: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 2: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#0e0f12', raised: '#16181d', border: '#262a31' },
        accent: { DEFAULT: '#fc4c02', muted: '#c63d04' }, // Strava-like orange
        ink: { DEFAULT: '#f2f4f7', muted: '#9aa3af' }
      }
    }
  },
  plugins: []
} satisfies Config;
```

- [ ] **Step 3: Create `src/app.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  @apply h-full bg-surface text-ink antialiased;
}
```

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts postcss.config.js src/app.css
git commit -m "chore: add Tailwind dark sports theme"
```

---

### Task 5: App shell (app.html + root layout)

**Files:**
- Create: `src/app.html`
- Create: `src/routes/+layout.ts`
- Create: `src/routes/+layout.svelte`
- Create: `src/routes/+page.svelte`

- [ ] **Step 1: Create `src/app.html`**

```html
<!doctype html>
<html lang="en" class="dark h-full">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0e0f12" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover" class="h-full">
    <div class="h-full">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 2: Create `src/routes/+layout.ts` (disable SSR + prerender — required for Capacitor)**

```ts
export const ssr = false;
export const prerender = false;
export const csr = true;
```

- [ ] **Step 3: Create `src/routes/+layout.svelte`**

```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 4: Create `src/routes/+page.svelte` (redirect root to the merge tab)**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  onMount(() => goto('/merge'));
</script>
```

- [ ] **Step 5: Commit**

```bash
git add src/app.html src/routes/+layout.ts src/routes/+layout.svelte src/routes/+page.svelte
git commit -m "feat: add app shell and SPA root layout"
```

---

### Task 6: Tab routes (merge / trim / settings)

**Files:**
- Create: `src/routes/(tabs)/+layout.svelte`
- Create: `src/routes/(tabs)/merge/+page.svelte`
- Create: `src/routes/(tabs)/trim/+page.svelte`
- Create: `src/routes/(tabs)/settings/+page.svelte`

- [ ] **Step 1: Create `src/routes/(tabs)/+layout.svelte` (bottom tab nav placeholder)**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  let { children } = $props();
  const tabs = [
    { href: '/merge', label: 'Merge' },
    { href: '/trim', label: 'Trim' },
    { href: '/settings', label: 'Settings' }
  ];
</script>

<div class="flex h-full flex-col">
  <main class="flex-1 overflow-y-auto p-4">
    {@render children()}
  </main>
  <nav class="flex border-t border-surface-border bg-surface-raised">
    {#each tabs as tab}
      <a
        href={tab.href}
        class="flex-1 py-3 text-center text-sm font-medium {$page.url.pathname === tab.href
          ? 'text-accent'
          : 'text-ink-muted'}"
      >
        {tab.label}
      </a>
    {/each}
  </nav>
</div>
```

- [ ] **Step 2: Create `src/routes/(tabs)/merge/+page.svelte`**

```svelte
<h1 class="text-xl font-semibold">Merge</h1>
<p class="text-ink-muted">Import and merge GPX files. (Phase 4)</p>
```

- [ ] **Step 3: Create `src/routes/(tabs)/trim/+page.svelte`**

```svelte
<h1 class="text-xl font-semibold">Trim</h1>
<p class="text-ink-muted">Trim a track with the range slider. (Phase 4)</p>
```

- [ ] **Step 4: Create `src/routes/(tabs)/settings/+page.svelte`**

```svelte
<h1 class="text-xl font-semibold">Settings</h1>
<p class="text-ink-muted">Calibration and privacy/consent. (Phase 4)</p>
```

- [ ] **Step 5: Commit**

```bash
git add "src/routes/(tabs)"
git commit -m "feat: add merge/trim/settings tab routes"
```

---

### Task 7: lib/ skeleton + static dir

**Files:**
- Create: `.gitkeep` in each `src/lib/` subdirectory and `static/`

- [ ] **Step 1: Create directory skeleton with `.gitkeep` placeholders**

Run:
```bash
mkdir -p src/lib/domain/entities src/lib/domain/usecases \
  src/lib/data/parsing src/lib/data/serialization src/lib/data/io \
  src/lib/ads src/lib/stores src/lib/workers src/lib/components static
for d in src/lib/domain/entities src/lib/domain/usecases \
  src/lib/data/parsing src/lib/data/serialization src/lib/data/io \
  src/lib/ads src/lib/stores src/lib/workers src/lib/components static; do
  touch "$d/.gitkeep"
done
```
Expected: all directories exist with a `.gitkeep` file.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: add lib/ hexagonal directory skeleton"
```

---

### Task 8: Capacitor config

**Files:**
- Create: `capacitor.config.ts`

- [ ] **Step 1: Create `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velologiclabs.gpxtools',
  appName: 'GPX Tooling Suite',
  webDir: 'build',
  android: {
    allowMixedContent: false
  }
};

export default config;
```

- [ ] **Step 2: Commit**

```bash
git add capacitor.config.ts
git commit -m "chore: add Capacitor config for Android (appId com.velologiclabs.gpxtools)"
```

---

### Task 9: Vitest smoke test + verification gate

**Files:**
- Create: `src/lib/index.test.ts`

- [ ] **Step 1: Write the smoke test**

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain smoke test', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test`
Expected: PASS (1 test passing).

- [ ] **Step 3: Type-check the project**

Run: `npm run check`
Expected: completes with 0 errors and 0 warnings.

- [ ] **Step 4: Production build (verifies adapter-static SPA output)**

Run: `npm run build`
Expected: completes; `build/index.html` exists (the SPA fallback).

- [ ] **Step 5: Confirm SPA fallback exists**

Run: `test -f build/index.html && echo OK`
Expected: prints `OK`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/index.test.ts
git commit -m "test: add toolchain smoke test"
```

---

## One-time native setup (run by the user, after this plan)

These are **not** part of the automated tasks — they require the Android SDK and
modify native folders. Document for the user:

```bash
npm run build          # produce build/ (web assets)
npm run android:add    # one-time: npx cap add android  → creates android/
npm run sync           # npx cap sync android  → copies web assets + plugins
# then open in Android Studio:  npx cap open android
```

---

## Self-Review

**Spec coverage (Step 1 of spec §9 + §2 directory map):**
- adapter-static + fallback index.html → Task 2 ✓
- ssr/prerender disabled → Task 5 (`+layout.ts`) ✓
- capacitor.config.ts (appId, webDir build) → Task 8 ✓
- package.json scripts (build → cap sync) → Task 1 ✓
- `lib/` hexagonal structure → Task 7 ✓
- 3 tab routes merge/trim/settings → Task 6 ✓
- Tailwind dark sports theme → Task 4 ✓
- TypeScript strict → Task 2 ✓
- Vitest wired → Task 3 + Task 9 ✓
- Dependency list (Capacitor, AdMob/UMP, filesystem, share, file-picker) → Task 1 ✓

Note: actual `GpxProcessor`, `AdManager`, parsers, stores, and UI components are
**deferred to later phases** per the spec's phasing (§11); Phase 1 only creates
their directory homes as stubs. This matches the "scaffold, then stop" deliverable.

**Placeholder scan:** Tab pages contain "(Phase 4)" copy — these are intentional
visible placeholders in scaffolding, not plan placeholders; all config/code steps
contain complete content.

**Type consistency:** Script names (`build`, `sync`, `android:add`, `check`,
`test`) are consistent across Tasks 1 and 9 and the native-setup section. Tailwind
color tokens (`surface`, `surface-border`, `surface-raised`, `accent`, `ink`,
`ink-muted`) defined in Task 4 match their usage in Tasks 4–6.
