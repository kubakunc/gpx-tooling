<script lang="ts">
  import ToolTile from '$lib/components/ToolTile.svelte';
  import { toolThemes, relatedApp } from '$lib/toolThemes';

  const tiles = [
    {
      key: 'merge',
      href: '/tools/merge',
      icon: '⤬',
      iconSize: 20,
      title: 'Merge files',
      subtitle: 'Combine into one track'
    },
    {
      key: 'trim',
      href: '/tools/trim',
      icon: '✂',
      iconSize: 20,
      title: 'Trim track',
      subtitle: 'Cut range on the map'
    },
    {
      key: 'convert',
      href: '/tools/convert',
      icon: '⇄',
      iconSize: 19,
      title: 'Convert',
      subtitle: 'GPX · FIT · TCX · KML'
    },
    {
      key: 'elevation',
      href: '/tools/elevation',
      icon: '⛰',
      iconSize: 20,
      title: 'Elevation fix',
      subtitle: 'Fix profile & total gain'
    },
    {
      key: 'reduce',
      href: '/tools/reduce',
      icon: '⊚',
      iconSize: 19,
      title: 'Reduce points',
      subtitle: 'Shrink file size'
    },
    {
      key: 'compare',
      href: '/tools/compare',
      icon: '≈',
      iconSize: 21,
      title: 'Compare tracks',
      subtitle: 'Chart two files together'
    }
  ] as const;
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
  {#each tiles as t}
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
    />
  {/each}
</div>

<div class="px-6 pb-6 pt-[14px]">
  <div class="mb-[11px] flex items-center gap-[10px]">
    <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Related app</div>
    <div class="h-px flex-1" style="background:#ece8e1;"></div>
  </div>
  <a
    href="/files"
    class="flex items-center gap-[14px] rounded-[18px] border p-[14px]"
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
        Pull GPX tracks from your accounts · separate app
      </div>
    </div>
    <div
      class="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[15px]"
      style="background:#cdf0f5;color:#0e7490;"
    >
      ↗
    </div>
  </a>
</div>
