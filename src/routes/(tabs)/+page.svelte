<script lang="ts">
  import ToolTile from '$lib/components/ToolTile.svelte';
  import { toolThemes, relatedApp } from '$lib/toolThemes';

  const tiles = [
    {
      key: 'merge',
      href: '/tools/merge',
      title: 'Merge files',
      subtitle: 'Combine into one track',
      soon: false
    },
    {
      key: 'trim',
      href: '/tools/trim',
      title: 'Trim track',
      subtitle: 'Cut range on the map',
      soon: false
    },
    {
      key: 'convert',
      href: '/tools/convert',
      title: 'Convert',
      subtitle: 'GPX · FIT · TCX · KML',
      soon: false
    },
    {
      key: 'elevation',
      href: '/tools/elevation',
      title: 'Elevation fix',
      subtitle: 'Fix profile & total gain',
      soon: false
    },
    {
      key: 'reduce',
      href: '/tools/reduce',
      title: 'Reduce points',
      subtitle: 'Shrink file size',
      soon: false
    },
    {
      key: 'compare',
      href: '/tools/compare',
      title: 'Compare tracks',
      subtitle: 'Chart two files together',
      soon: false
    },
    {
      key: 'reverse',
      href: '/tools/reverse',
      title: 'Reverse track',
      subtitle: 'Flip the route direction',
      soon: false
    },
    {
      key: 'strip',
      href: '/tools/strip',
      title: 'Strip & minify',
      subtitle: 'Remove data, shrink file',
      soon: false
    },
    {
      key: 'time',
      href: '/tools/time',
      title: 'Time & speed',
      subtitle: 'Fix start time & pauses',
      soon: false
    },
    {
      key: 'repair',
      href: '/tools/repair',
      title: 'Repair file',
      subtitle: 'Clean GPS spikes & errors',
      soon: false
    }
  ] as const;

  const STRAVA_EXPORTER_URL =
    'https://play.google.com/store/apps/details?id=com.velologiclabs.gpxexporter';

  function openStravaExporter() {
    window.open(STRAVA_EXPORTER_URL, '_blank');
  }
</script>

<div class="px-6 pb-2 pt-[18px]">
  <div class="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">GPX Suite</div>
  <h1 class="text-[27px] font-extrabold tracking-[-0.02em] text-ink">Tools</h1>
</div>

<div class="grid grid-cols-2 gap-[11px] px-6 pt-[6px]">
  {#each tiles as t (t.key)}
    {@const theme = toolThemes[t.key]}
    <ToolTile
      href={t.href}
      tile={theme.tile}
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
    onclick={openStravaExporter}
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
        Pull GPX tracks from your accounts
      </div>
    </div>
    <div
      class="flex h-[28px] w-[28px] items-center justify-center rounded-full text-[14px] font-bold"
      style="background:#cdf0f5;color:#0e7490;"
      aria-hidden="true"
    >
      ↗
    </div>
  </button>
</div>
