<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';

  const t = toolThemes.convert;

  const formats = ['GPX', 'FIT', 'TCX', 'KML'];
  const selectedIndex = formats.indexOf('TCX');
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
        <div class="mt-[2px] text-[24px] font-extrabold tracking-[0.02em]" style="color:{t.title};">GPX</div>
      </div>
      <div class="text-[24px] font-extrabold" style="color:{t.icon};">→</div>
      <div
        class="flex-1 rounded-[18px] p-4 text-center"
        style="background:{t.icon};box-shadow:0 10px 22px {rgba(t.icon, 0.3)};"
      >
        <div class="text-[10px] font-bold uppercase tracking-[0.1em]" style="color:#ffd6e8;">To</div>
        <div class="mt-[2px] text-[24px] font-extrabold tracking-[0.02em] text-white">TCX</div>
      </div>
    </div>

    <div class="px-6 pt-[18px] text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
      Target format
    </div>
    <div class="flex gap-[10px] px-6 pt-[10px]">
      <SegmentedControl
        options={formats}
        {selectedIndex}
        radius={14}
        selectedBg={t.tile}
        selectedBorder={t.icon}
        selectedText={t.button}
        selectedPadY={12}
        unselectedPadY={13}
        textSize={14}
      />
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
        <Toggle on={true} accent={t.icon} />
      </div>
      <div
        class="flex items-center gap-3 rounded-[16px] border bg-white px-[15px] py-[13px]"
        style="border-color:#efece6;"
      >
        <div class="flex-1 text-[14px] font-bold text-ink">Timestamps</div>
        <Toggle on={true} accent={t.icon} />
      </div>
      <div
        class="flex items-center gap-3 rounded-[16px] border bg-white px-[15px] py-[13px]"
        style="border-color:#efece6;"
      >
        <div class="flex-1 text-[14px] font-bold text-ink">Waypoints</div>
        <Toggle on={false} accent={t.icon} />
      </div>
    </div>
  </div>

  <div class="px-6 pb-3 pt-2">
    <button
      class="h-[56px] w-full rounded-[20px] text-[16px] font-extrabold text-white"
      style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.32)};"
    >
      Convert → ride_morning.tcx
    </button>
  </div>
</div>
