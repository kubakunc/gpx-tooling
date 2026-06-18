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

<div class="px-6 pb-6 pt-[16px]">
  <button
    type="button"
    onclick={openStravaExporter}
    data-testid="related-app"
    class="w-full overflow-hidden rounded-[20px] border p-[16px] text-left"
    style="background:{relatedApp.tile};border-color:{relatedApp.border};box-shadow:0 8px 22px rgba(6,182,212,0.12);"
  >
    <div class="flex items-center gap-[14px]">
      <img
        src="/gpx-exporter-icon.webp"
        alt="Export GPX for Strava, Komoot app icon"
        width="56"
        height="56"
        class="h-[56px] w-[56px] shrink-0 rounded-[16px]"
        style="box-shadow:0 6px 14px rgba(0,0,0,0.18);"
      />
      <div class="min-w-0 flex-1">
        <div class="text-[16px] font-extrabold leading-[1.2]" style="color:{relatedApp.title};">
          Export GPX for Strava, Komoot
        </div>
        <div class="mt-[2px] text-[11px] font-semibold" style="color:{relatedApp.subtitle};">
          by VeloLogic Labs · Free
        </div>
      </div>
    </div>
    <div class="mt-[12px] text-[12px] leading-[1.5]" style="color:{relatedApp.title};">
      Pull your rides straight from your accounts — no fiddly manual export. Then merge, trim &amp; repair them right here.
    </div>
    <div
      class="mt-[12px] flex items-center justify-center gap-[6px] rounded-[12px] py-[10px] text-[13px] font-extrabold text-white"
      style="background:{relatedApp.icon};"
    >
      Get it on Google Play <span aria-hidden="true">↗</span>
    </div>
  </button>
</div>
