<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import Slider from '$lib/components/Slider.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';

  const t = toolThemes.elevation;

  const sources = ['GPS', 'SRTM', 'Mapbox'];
  const selectedIndex = sources.indexOf('SRTM');
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Elevation fix" />

    <div
      class="mx-6 my-[14px] rounded-[22px] border bg-white px-[14px] pb-3 pt-4"
      style="border-color:#f3ead2;box-shadow:0 8px 22px {rgba(t.icon, 0.1)};"
    >
      <div class="mb-2 flex items-center gap-4 text-[11px] font-bold">
        <div class="flex items-center gap-[6px]" style="color:#a8a29e;">
          <span class="inline-block h-[3px] w-[14px] rounded-[2px]" style="background:#d6c4a0;"></span>Raw GPS
        </div>
        <div class="flex items-center gap-[6px]" style="color:{t.button};">
          <span class="inline-block h-[3px] w-[14px] rounded-[2px]" style="background:{t.icon};"></span>Corrected
        </div>
      </div>
      <svg viewBox="0 0 340 104" width="100%" height="104" preserveAspectRatio="none" class="block">
        <defs
          ><linearGradient id="elevg" x1="0" y1="0" x2="0" y2="1"
            ><stop offset="0" stop-color={t.icon} stop-opacity="0.3" /><stop
              offset="1"
              stop-color={t.icon}
              stop-opacity="0"
            /></linearGradient
          ></defs
        >
        <path
          d="M0,80 L20,60 L40,72 L60,40 L80,66 L100,30 L120,58 L140,24 L160,52 L180,20 L200,44 L220,16 L240,40 L260,22 L280,46 L300,34 L320,58 L340,44 L340,104 L0,104 Z"
          fill="url(#elevg)"
        />
        <path
          d="M0,82 L20,56 L40,78 L60,36 L80,72 L100,26 L120,64 L140,20 L160,58 L180,16 L200,50 L220,12 L240,46 L260,18 L280,52 L300,30 L320,64 L340,40"
          fill="none"
          stroke="#d6c4a0"
          stroke-width="2"
          stroke-dasharray="3 3"
        />
        <path
          d="M0,80 L20,60 L40,72 L60,40 L80,66 L100,30 L120,58 L140,24 L160,52 L180,20 L200,44 L220,16 L240,40 L260,22 L280,46 L300,34 L320,58 L340,44"
          fill="none"
          stroke={t.icon}
          stroke-width="2.6"
        />
      </svg>
      <div class="mt-[10px] flex justify-between">
        <div>
          <div class="text-[11px]" style="color:#b08b4a;">Gain before</div>
          <div class="text-[20px] font-extrabold line-through" style="color:#a8a29e;">1057 m</div>
        </div>
        <div class="text-right">
          <div class="text-[11px]" style="color:{t.button};">Corrected</div>
          <div class="text-[20px] font-extrabold" style="color:{t.title};">1042 m</div>
        </div>
      </div>
    </div>

    <div class="px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
      Elevation source
    </div>
    <div class="flex gap-2 px-6 pt-[10px]">
      <SegmentedControl
        options={sources}
        {selectedIndex}
        radius={13}
        selectedBg={t.tile}
        selectedBorder={t.icon}
        selectedText={t.title}
        selectedPadY={10}
        unselectedPadY={11}
        textSize={13}
      />
    </div>

    <div class="mx-6 mb-4 mt-[18px] rounded-[16px] border bg-white px-4 py-[14px]" style="border-color:#efece6;">
      <div class="mb-[10px] flex justify-between">
        <div class="text-[14px] font-bold text-ink">Smoothing</div>
        <div class="text-[13px] font-extrabold" style="color:{t.button};">Medium</div>
      </div>
      <Slider percent={55} accent={t.icon} trackBg="#f1ead9" />
    </div>
  </div>

  <div class="px-6 pb-3 pt-2">
    <button
      class="h-[56px] w-full rounded-[20px] text-[16px] font-extrabold text-white"
      style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.3)};"
    >
      Apply correction
    </button>
  </div>
</div>
