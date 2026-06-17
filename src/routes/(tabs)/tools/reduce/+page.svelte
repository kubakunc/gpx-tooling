<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import RouteMap from '$lib/components/RouteMap.svelte';
  import MapBadge from '$lib/components/MapBadge.svelte';
  import Slider from '$lib/components/Slider.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';

  const t = toolThemes.reduce;
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Reduce points" />

    <div
      class="mx-6 mt-[14px] overflow-hidden rounded-[22px] border"
      style="border-color:#e6dff5;box-shadow:0 8px 22px {rgba(t.icon, 0.1)};"
    >
      <div class="relative h-[150px]" style="background:#ece9f4;">
        <RouteMap variant="reduce" />
        <MapBadge position="left-3 top-3" extraClass="text-[11px] font-extrabold">
          <span style="color:{t.title};">Kept route</span>
        </MapBadge>
        <MapBadge
          position="bottom-[10px] left-3"
          extraClass="flex items-center gap-[10px] text-[11px] font-bold"
        >
          <span class="flex items-center gap-[5px]" style="color:#9a8fc0;"
            ><span class="inline-block h-[3px] w-3 rounded-[2px]" style="background:#cdbfe8;"></span
            >original</span
          >
          <span class="flex items-center gap-[5px]" style="color:{t.title};"
            ><span class="inline-block h-[3px] w-3 rounded-[2px]" style="background:{t.icon};"></span
            >simplified</span
          >
        </MapBadge>
      </div>
      <div class="flex gap-3 bg-white px-4 pb-4 pt-[14px]">
        <div class="flex-1 rounded-[14px] p-3" style="background:#f6f1fd;">
          <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">Points</div>
          <div class="mt-[2px] text-[18px] font-extrabold" style="color:{t.title};">
            <span style="color:#b3a3d6;">8 412</span> → 2 240
          </div>
        </div>
        <div class="flex-1 rounded-[14px] p-3" style="background:#f6f1fd;">
          <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">Size</div>
          <div class="mt-[2px] text-[18px] font-extrabold" style="color:{t.title};">
            <span style="color:#b3a3d6;">1.8 MB</span> → 0.5 MB
          </div>
        </div>
      </div>
    </div>

    <div class="mx-6 rounded-[16px] border bg-white p-4" style="border-color:#efece6;">
      <div class="mb-3 flex justify-between">
        <div class="text-[14px] font-bold text-ink">Accuracy</div>
        <div class="text-[13px] font-extrabold" style="color:{t.button};">High · 73%</div>
      </div>
      <Slider percent={73} accent={t.icon} trackBg="#efe9fb" />
      <div class="mt-2 flex justify-between text-[11px] font-semibold" style="color:#a89ec0;">
        <span>Smaller file</span><span>Track fidelity</span>
      </div>
    </div>

    <div
      class="mx-6 mt-[14px] flex items-center gap-3 rounded-[16px] border bg-white px-[15px] py-[13px]"
      style="border-color:#efece6;"
    >
      <div class="flex-1 text-[14px] font-bold text-ink">Keep elevation &amp; time</div>
      <Toggle on={true} accent={t.icon} />
    </div>
  </div>

  <div class="px-6 pb-3 pt-2">
    <button
      class="h-[56px] w-full rounded-[20px] text-[16px] font-extrabold text-white"
      style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.3)};"
    >
      Reduce &amp; save
    </button>
  </div>
</div>
