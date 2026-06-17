<script lang="ts">
  import { page } from '$app/state';

  const items = [
    { href: '/', glyph: '▦', label: 'Menu', match: (p: string) => p === '/' || p.startsWith('/tools') },
    { href: '/files', glyph: '🗂', label: 'Files', match: (p: string) => p === '/files' },
    { href: '/settings', glyph: '⚙', label: 'Settings', match: (p: string) => p === '/settings' }
  ];

  let pathname = $derived(page.url.pathname);
</script>

<nav class="flex h-[66px] border-t border-line bg-screen">
  {#each items as item}
    {@const active = item.match(pathname)}
    <a
      href={item.href}
      class="flex flex-1 flex-col items-center justify-center gap-1"
      style="color:{active ? '#1c1917' : '#b0aaa2'};"
    >
      <span class="text-[18px] leading-none">{item.glyph}</span>
      <span class="text-[10px]" style="font-weight:{active ? 800 : 600};">{item.label}</span>
    </a>
  {/each}
</nav>
