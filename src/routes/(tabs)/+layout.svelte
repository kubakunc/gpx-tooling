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
