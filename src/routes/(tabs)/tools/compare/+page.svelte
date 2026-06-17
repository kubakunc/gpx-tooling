<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import { showToast } from '$lib/stores/toast';

  const t = toolThemes.compare;

  const metrics = ['Power', 'Heart rate', 'Cadence'];
  const selectedIndex = metrics.indexOf('Power');

  function notYet() {
    showToast("This tool isn't available yet", 'info');
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Compare tracks" />

    <div class="px-6 pt-1 text-[11px] font-semibold text-ink-faint">
      Preview — not functional yet
    </div>

    <div class="opacity-60 pointer-events-none">
    <div class="mx-6 mt-[6px] flex gap-[10px]">
      <div
        class="flex flex-1 items-center gap-2 rounded-[12px] px-3 py-[10px]"
        style="background:{t.tile};"
      >
        <div class="h-[9px] w-[9px] rounded-full" style="background:{t.icon};"></div>
        <div class="text-[13px] font-bold" style="color:{t.title};">pioneer.fit</div>
      </div>
      <div
        class="flex flex-1 items-center gap-2 rounded-[12px] px-3 py-[10px]"
        style="background:#fef3c7;"
      >
        <div class="h-[9px] w-[9px] rounded-full" style="background:#f59e0b;"></div>
        <div class="text-[13px] font-bold" style="color:#92400e;">assioma.fit</div>
      </div>
    </div>

    <div class="flex gap-2 px-6 pt-[14px]">
      <SegmentedControl
        options={metrics}
        {selectedIndex}
        radius={12}
        selectedBg={t.icon}
        selectedText="#ffffff"
        selectedPadY={10}
        unselectedPadY={9}
        textSize={13}
      />
    </div>

    <div
      class="mx-6 mt-[14px] rounded-[20px] border bg-white px-[14px] pb-[10px] pt-[14px]"
      style="border-color:#ece9f6;box-shadow:0 8px 22px {rgba(t.icon, 0.08)};"
    >
      <svg viewBox="0 0 340 130" width="100%" height="130" preserveAspectRatio="none" class="block">
        <g stroke="#f1eff8" stroke-width="1"><path d="M0,32 H340 M0,64 H340 M0,96 H340" /></g>
        <path
          d="M0,86 L24,66 L48,78 L72,46 L96,56 L120,36 L144,62 L168,34 L192,54 L216,40 L240,26 L264,51 L288,38 L312,58 L340,44"
          fill="none"
          stroke={t.icon}
          stroke-width="2.6"
        />
        <path
          d="M12,90 L36,70 L60,82 L84,50 L108,60 L132,40 L156,66 L180,38 L204,58 L228,44 L252,30 L276,55 L300,42 L324,62 L340,52"
          fill="none"
          stroke="#f59e0b"
          stroke-width="2.6"
        />
      </svg>
      <div class="flex justify-between px-[2px] text-[10px] font-semibold" style="color:#a8a29e;">
        <span>00:00</span><span>00:45</span><span>01:30</span>
      </div>
    </div>

    <div class="mx-6 mt-[14px] rounded-[18px] border bg-white px-4 py-[15px]" style="border-color:#ece9f6;">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-[14px] font-bold text-ink">
          Shift <span class="rounded-[6px] px-[6px] py-[1px]" style="color:#b08900;background:#fef3c7;">assioma.fit</span>
        </div>
        <div class="flex items-center gap-[10px]">
          <div
            class="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[18px] font-extrabold"
            style="background:{t.tile};color:{t.button};"
          >
            −
          </div>
          <div class="min-w-[46px] text-center text-[15px] font-extrabold" style="color:{t.title};">+2.4 s</div>
          <div
            class="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[18px] font-extrabold"
            style="background:{t.tile};color:{t.button};"
          >
            ＋
          </div>
        </div>
      </div>
      <div class="relative h-[6px] rounded-[3px]" style="background:#eceaf7;">
        <div class="absolute left-1/2 top-0 bottom-0 w-[8%] rounded-[3px]" style="background:{t.icon};"></div>
        <div
          class="absolute left-[58%] top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style="background:{t.icon};box-shadow:0 2px 6px {rgba(t.icon, 0.5)};"
        ></div>
      </div>
      <div class="mt-[9px] text-[11px] font-semibold" style="color:#9a9eb5;">
        Align signals when devices started at different times
      </div>
    </div>

    <div class="mx-6 mb-4 mt-[14px] flex gap-[10px]">
      <div class="flex-1 rounded-[14px] p-3" style="background:{t.tile};">
        <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">Avg power A</div>
        <div class="text-[20px] font-extrabold" style="color:{t.title};">248 W</div>
      </div>
      <div class="flex-1 rounded-[14px] p-3" style="background:#fef3c7;">
        <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:#b08900;">Avg power B</div>
        <div class="text-[20px] font-extrabold" style="color:#92400e;">252 W</div>
      </div>
      <div class="flex-1 rounded-[14px] p-3" style="background:#f3f1ec;">
        <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:#9a9488;">Difference</div>
        <div class="text-[20px] font-extrabold text-ink">+1.6%</div>
      </div>
    </div>
    </div>
  </div>

  <div class="flex gap-3 px-6 pb-3 pt-2">
    <button
      type="button"
      onclick={notYet}
      class="h-[56px] flex-1 rounded-[20px] text-[16px] font-extrabold text-white"
      style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.32)};"
    >
      Save comparison
    </button>
    <button
      type="button"
      onclick={notYet}
      class="h-[56px] w-[56px] rounded-[20px] text-[18px]"
      style="background:{t.tile};color:{t.button};"
      aria-label="Reset"
    >
      ↺
    </button>
  </div>
</div>
