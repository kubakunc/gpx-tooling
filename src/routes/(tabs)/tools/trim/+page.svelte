<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import RouteMap from '$lib/components/RouteMap.svelte';
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Trim track" />

    <div
      class="mx-6 mt-[6px] inline-flex items-center gap-[9px] rounded-[12px] px-[14px] py-[9px]"
      style="background:#eff6ff;"
    >
      <div class="h-5 w-2 rounded-[4px]" style="background:#3b82f6;"></div>
      <div class="text-[14px] font-bold" style="color:#1e3a8a;">ride_morning.gpx</div>
    </div>

    <div
      class="relative mx-6 mt-3 h-[150px] overflow-hidden rounded-[20px] border"
      style="background:#e8eef4;border-color:#dbe5f0;"
    >
      <RouteMap variant="trim" />
      <div
        class="pointer-events-none absolute left-3 top-3 z-[500] rounded-[10px] px-[11px] py-[6px] text-[11px] font-extrabold"
        style="background:rgba(255,255,255,.92);color:#1e3a8a;box-shadow:0 2px 8px rgba(0,0,0,.14);"
      >
        Kept segment
      </div>
      <div
        class="pointer-events-none absolute bottom-[10px] left-3 z-[500] flex items-center gap-[10px] rounded-[10px] px-[11px] py-[6px] text-[11px] font-bold"
        style="background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.14);"
      >
        <span class="flex items-center gap-[5px]" style="color:#1e3a8a;"
          ><span class="inline-block h-[3px] w-3 rounded-[2px]" style="background:#1d4ed8;"></span
          >kept</span
        >
        <span class="flex items-center gap-[5px]" style="color:#9aa6b6;"
          ><span class="inline-block w-3" style="border-top:3px dotted #93a3ba;"></span>cut</span
        >
      </div>
    </div>

    <div
      class="mx-6 mt-3 rounded-[20px] border bg-white px-[14px] pb-3 pt-[14px]"
      style="border-color:#e8eef7;box-shadow:0 8px 22px rgba(59,130,246,.08);"
    >
      <div class="relative h-[96px]">
        <svg viewBox="0 0 340 96" width="100%" height="96" preserveAspectRatio="none" class="block">
          <defs
            ><linearGradient id="trimg" x1="0" y1="0" x2="0" y2="1"
              ><stop offset="0" stop-color="#3b82f6" stop-opacity="0.35" /><stop
                offset="1"
                stop-color="#3b82f6"
                stop-opacity="0"
              /></linearGradient
            ></defs
          >
          <path
            d="M0,74 L20,66 L40,69 L60,46 L80,53 L100,34 L120,42 L140,27 L160,37 L180,24 L200,32 L220,19 L240,30 L260,18 L280,27 L300,32 L320,45 L340,40 L340,96 L0,96 Z"
            fill="#eef2f7"
          />
          <rect x="78" y="0" width="186" height="96" fill="url(#trimg)" />
          <path
            d="M0,74 L20,66 L40,69 L60,46 L80,53 L100,34 L120,42 L140,27 L160,37 L180,24 L200,32 L220,19 L240,30 L260,18 L280,27 L300,32 L320,45 L340,40"
            fill="none"
            stroke="#c2d3ea"
            stroke-width="2"
          />
          <path
            d="M80,53 L100,34 L120,42 L140,27 L160,37 L180,24 L200,32 L220,19 L240,30 L260,18"
            fill="none"
            stroke="#1d4ed8"
            stroke-width="3"
          />
        </svg>
        <div class="absolute bottom-0 top-0 left-[23%] w-[3px] rounded-[2px]" style="background:#1d4ed8;"></div>
        <div
          class="absolute left-[23%] top-1/2 h-[28px] w-[16px] -translate-x-1/2 -translate-y-1/2 rounded-[6px]"
          style="background:#1d4ed8;box-shadow:0 3px 8px rgba(29,78,216,.4);"
        ></div>
        <div class="absolute bottom-0 top-0 left-[77%] w-[3px] rounded-[2px]" style="background:#1d4ed8;"></div>
        <div
          class="absolute left-[77%] top-1/2 h-[28px] w-[16px] -translate-x-1/2 -translate-y-1/2 rounded-[6px]"
          style="background:#1d4ed8;box-shadow:0 3px 8px rgba(29,78,216,.4);"
        ></div>
      </div>
      <div class="mt-[10px] flex items-center justify-between">
        <div class="rounded-[11px] px-[11px] py-[7px]" style="background:#eff6ff;">
          <div class="text-[9px] font-bold uppercase tracking-[0.08em]" style="color:#6b8fc7;">Start</div>
          <div class="text-[15px] font-extrabold" style="color:#1e3a8a;">00:12:30</div>
        </div>
        <div class="text-center">
          <div class="text-[9px] font-bold uppercase tracking-[0.08em]" style="color:#6b8fc7;">Kept</div>
          <div class="text-[15px] font-extrabold" style="color:#1d4ed8;">19.8 km · 1:35:40</div>
        </div>
        <div class="rounded-[11px] px-[11px] py-[7px] text-right" style="background:#eff6ff;">
          <div class="text-[9px] font-bold uppercase tracking-[0.08em]" style="color:#6b8fc7;">End</div>
          <div class="text-[15px] font-extrabold" style="color:#1e3a8a;">01:48:10</div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex gap-3 px-6 pb-3 pt-2">
    <button
      class="h-[56px] flex-1 rounded-[20px] text-[16px] font-extrabold text-white"
      style="background:#1d4ed8;box-shadow:0 12px 26px rgba(29,78,216,.32);"
    >
      Trim &amp; save
    </button>
    <button
      class="h-[56px] w-[56px] rounded-[20px] text-[18px]"
      style="background:#eff6ff;color:#1d4ed8;"
      aria-label="Reset"
    >
      ↺
    </button>
  </div>
</div>
