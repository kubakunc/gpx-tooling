<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import RouteMap from '$lib/components/RouteMap.svelte';

  const files = [
    { n: 1, bg: '#34d399', name: 'ride_morning.gpx', meta: '24.3 km · +312 m · 07:14' },
    { n: 2, bg: '#10b981', name: 'ride_afternoon.fit', meta: '18.7 km · +205 m · 14:02' },
    { n: 3, bg: '#059669', name: 'climb_segment.gpx', meta: '6.2 km · +540 m · 16:38' }
  ];
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Merge files" />

    <div
      class="relative mx-6 mt-3 h-[158px] overflow-hidden rounded-[20px] border"
      style="background:#e8eee9;border-color:#dbe7df;"
    >
      <RouteMap variant="merge" />
      <div
        class="pointer-events-none absolute left-3 top-3 z-[500] rounded-[10px] px-[11px] py-[6px] text-[11px] font-extrabold"
        style="background:rgba(255,255,255,.92);color:#064e3b;box-shadow:0 2px 8px rgba(0,0,0,.14);"
      >
        Merged route
      </div>
      <div
        class="pointer-events-none absolute right-3 top-3 z-[500] flex gap-3 rounded-[10px] px-[11px] py-[6px]"
        style="background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.14);"
      >
        <div>
          <span class="text-[14px] font-extrabold" style="color:#064e3b;">49.2</span><span
            class="text-[10px] font-bold"
            style="color:#5b8c7d;"
          >
            km</span
          >
        </div>
        <div>
          <span class="text-[14px] font-extrabold" style="color:#064e3b;">+1057</span><span
            class="text-[10px] font-bold"
            style="color:#5b8c7d;"
          >
            m</span
          >
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between px-6 pt-4">
      <div class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
        3 files · drag to reorder
      </div>
      <div class="text-[12px] font-extrabold" style="color:#059669;">＋ Add</div>
    </div>

    <div class="flex flex-col gap-[10px] px-6 pb-4 pt-[10px]">
      {#each files as f}
        <div
          class="flex items-center gap-[13px] rounded-[18px] border bg-white p-[13px]"
          style="border-color:#eef0ec;box-shadow:0 5px 14px rgba(5,150,105,.05);"
        >
          <div
            class="flex h-9 w-9 items-center justify-center rounded-[11px] text-[15px] font-extrabold text-white"
            style="background:{f.bg};"
          >
            {f.n}
          </div>
          <div class="flex-1">
            <div class="text-[15px] font-bold text-ink">{f.name}</div>
            <div class="text-[12px]" style="color:#8a9099;">{f.meta}</div>
          </div>
          <div class="text-[18px]" style="color:#c4c9d0;">⠿</div>
        </div>
      {/each}
    </div>
  </div>

  <div class="px-6 pb-3 pt-2">
    <button
      class="h-[56px] w-full rounded-[20px] text-[16px] font-extrabold text-white"
      style="background:#059669;box-shadow:0 12px 26px rgba(5,150,105,.35);"
    >
      Merge &amp; export
    </button>
  </div>
</div>
