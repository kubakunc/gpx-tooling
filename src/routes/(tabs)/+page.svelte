<script lang="ts">
  import ToolTile from '$lib/components/ToolTile.svelte';
  import { toolThemes, relatedApp } from '$lib/toolThemes';
  import { showToast } from '$lib/stores/toast';

  const tiles = [
    {
      key: 'merge',
      href: '/tools/merge',
      icon: '⤬',
      iconSize: 20,
      title: 'Merge files',
      subtitle: 'Combine into one track',
      soon: false
    },
    {
      key: 'trim',
      href: '/tools/trim',
      icon: '✂',
      iconSize: 20,
      title: 'Trim track',
      subtitle: 'Cut range on the map',
      soon: false
    },
    {
      key: 'convert',
      href: '/tools/convert',
      icon: '⇄',
      iconSize: 19,
      title: 'Convert',
      subtitle: 'GPX · FIT · TCX · KML',
      soon: false
    },
    {
      key: 'elevation',
      href: '/tools/elevation',
      icon: '⛰',
      iconSize: 20,
      title: 'Elevation fix',
      subtitle: 'Fix profile & total gain',
      soon: false
    },
    {
      key: 'reduce',
      href: '/tools/reduce',
      icon: '⊚',
      iconSize: 19,
      title: 'Reduce points',
      subtitle: 'Shrink file size',
      soon: false
    },
    {
      key: 'compare',
      href: '/tools/compare',
      icon: '≈',
      iconSize: 21,
      title: 'Compare tracks',
      subtitle: 'Chart two files together',
      soon: true
    }
  ] as const;

  function stravaTeaser() {
    showToast('Strava & Komoot import is coming soon', 'info');
  }
</script>

<div class="flex items-center justify-between px-6 pb-2 pt-[18px]">
  <div>
    <div class="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">GPX Suite</div>
    <div class="text-[27px] font-extrabold tracking-[-0.02em] text-ink">Tools</div>
  </div>
  <div
    class="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-ink text-[16px] font-extrabold text-white"
  >
    GP
  </div>
</div>

<div class="grid grid-cols-2 gap-[11px] px-6 pt-[6px]">
  {#each tiles as t (t.key)}
    {@const theme = toolThemes[t.key]}
    <ToolTile
      href={t.href}
      icon={t.icon}
      iconSize={t.iconSize}
      tile={theme.tile}
      iconBg={theme.icon}
      title={t.title}
      titleColor={theme.title}
      subtitle={t.subtitle}
      subtitleColor={theme.subtitle}
      soon={t.soon}
    />
  {/each}
</div>

<div class="px-6 pb-6 pt-[14px]">
  <div class="mb-[11px] flex items-center gap-[10px]">
    <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Related app</div>
    <div class="h-px flex-1" style="background:#ece8e1;"></div>
  </div>
  <button
    type="button"
    onclick={stravaTeaser}
    class="flex w-full items-center gap-[14px] rounded-[18px] border p-[14px] text-left"
    style="background:{relatedApp.tile};border-color:{relatedApp.border};"
  >
    <div
      class="flex h-[44px] w-[44px] items-center justify-center rounded-[13px] text-[21px] text-white"
      style="background:{relatedApp.icon};"
    >
      ↧
    </div>
    <div class="flex-1">
      <div class="text-[15px] font-extrabold" style="color:{relatedApp.title};">
        Export from Strava &amp; Komoot
      </div>
      <div class="text-[11px]" style="color:{relatedApp.subtitle};">
        Pull GPX tracks from your accounts · coming soon
      </div>
    </div>
    <div
      class="rounded-full px-[9px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]"
      style="background:#cdf0f5;color:#0e7490;"
    >
      Soon
    </div>
  </button>
</div>
