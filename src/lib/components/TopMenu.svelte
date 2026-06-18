<script lang="ts">
  import { page } from '$app/state';

  const items = [
    { href: '/', glyph: '▦', label: 'Menu', match: (p: string) => p === '/' || p.startsWith('/tools') },
    { href: '/files', glyph: '🗂', label: 'Files', match: (p: string) => p === '/files' },
    { href: '/settings', glyph: '⚙', label: 'Settings', match: (p: string) => p === '/settings' }
  ];

  let open = $state(false);
  let pathname = $derived(page.url.pathname);

  // Close on any outside tap while open (the toggle stops propagation so its own
  // click doesn't immediately re-close). Listener is cleaned up when closed.
  $effect(() => {
    if (!open) return;
    const onDoc = () => (open = false);
    window.addEventListener('click', onDoc);
    return () => window.removeEventListener('click', onDoc);
  });
</script>

<div class="fixed right-4 z-50" style="top:calc(env(safe-area-inset-top) + 14px);">
  <button
    type="button"
    data-testid="nav-toggle"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label="Menu"
    onclick={(e) => {
      e.stopPropagation();
      open = !open;
    }}
    class="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ink text-[18px] text-white"
    style="box-shadow:0 6px 16px rgba(0,0,0,0.22);"
  >
    ☰
  </button>

  {#if open}
    <div
      role="menu"
      class="absolute right-0 mt-2 w-[184px] overflow-hidden rounded-[14px] border bg-white py-1"
      style="border-color:#eef0ec;box-shadow:0 12px 30px rgba(0,0,0,0.15);"
    >
      {#each items as item (item.href)}
        {@const active = item.match(pathname)}
        <a
          href={item.href}
          role="menuitem"
          data-testid="nav-{item.label.toLowerCase()}"
          class="flex items-center gap-3 px-4 py-3 text-[14px]"
          style="color:{active ? '#1c1917' : '#6b7077'};font-weight:{active ? 800 : 600};background:{active
            ? '#f4f1eb'
            : 'transparent'};"
          onclick={() => (open = false)}
        >
          <span class="text-[16px] leading-none">{item.glyph}</span>
          {item.label}
        </a>
      {/each}
    </div>
  {/if}
</div>
