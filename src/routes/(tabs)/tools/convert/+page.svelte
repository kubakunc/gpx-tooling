<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import Toggle from '$lib/components/Toggle.svelte';

  const formats = ['GPX', 'FIT', 'TCX', 'KML'];
  const selected = 'TCX';
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Convert format" />

    <div class="mx-6 mt-2 flex items-center gap-3">
      <div
        class="flex-1 rounded-[18px] border bg-white p-4 text-center"
        style="border-color:#f3dceb;"
      >
        <div class="text-[10px] font-bold uppercase tracking-[0.1em]" style="color:#b06a8c;">From</div>
        <div class="mt-[2px] text-[24px] font-extrabold tracking-[0.02em]" style="color:#831843;">GPX</div>
      </div>
      <div class="text-[24px] font-extrabold" style="color:#ec4899;">→</div>
      <div
        class="flex-1 rounded-[18px] p-4 text-center"
        style="background:#ec4899;box-shadow:0 10px 22px rgba(236,72,153,.3);"
      >
        <div class="text-[10px] font-bold uppercase tracking-[0.1em]" style="color:#ffd6e8;">To</div>
        <div class="mt-[2px] text-[24px] font-extrabold tracking-[0.02em] text-white">TCX</div>
      </div>
    </div>

    <div class="px-6 pt-[18px] text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
      Target format
    </div>
    <div class="flex gap-[10px] px-6 pt-[10px]">
      {#each formats as fmt}
        {#if fmt === selected}
          <div
            class="flex-1 rounded-[14px] py-3 text-center text-[14px] font-extrabold"
            style="background:#fdf2f8;border:2px solid #ec4899;color:#be185d;"
          >
            {fmt}
          </div>
        {:else}
          <div
            class="flex-1 rounded-[14px] border py-[13px] text-center text-[14px] font-bold"
            style="background:#fff;border-color:#efece6;color:#6b7077;"
          >
            {fmt}
          </div>
        {/if}
      {/each}
    </div>

    <div class="px-6 pt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
      Keep data
    </div>
    <div class="flex flex-col gap-[10px] px-6 pb-4 pt-[10px]">
      <div
        class="flex items-center gap-3 rounded-[16px] border bg-white px-[15px] py-[13px]"
        style="border-color:#efece6;"
      >
        <div class="flex-1 text-[14px] font-bold text-ink">
          Sensor data <span class="font-semibold" style="color:#9aa0a8;">HR · CAD · PWR</span>
        </div>
        <Toggle on={true} accent="#ec4899" />
      </div>
      <div
        class="flex items-center gap-3 rounded-[16px] border bg-white px-[15px] py-[13px]"
        style="border-color:#efece6;"
      >
        <div class="flex-1 text-[14px] font-bold text-ink">Timestamps</div>
        <Toggle on={true} accent="#ec4899" />
      </div>
      <div
        class="flex items-center gap-3 rounded-[16px] border bg-white px-[15px] py-[13px]"
        style="border-color:#efece6;"
      >
        <div class="flex-1 text-[14px] font-bold text-ink">Waypoints</div>
        <Toggle on={false} accent="#ec4899" />
      </div>
    </div>
  </div>

  <div class="px-6 pb-3 pt-2">
    <button
      class="h-[56px] w-full rounded-[20px] text-[16px] font-extrabold text-white"
      style="background:#be185d;box-shadow:0 12px 26px rgba(190,24,93,.32);"
    >
      Convert → ride_morning.tcx
    </button>
  </div>
</div>
