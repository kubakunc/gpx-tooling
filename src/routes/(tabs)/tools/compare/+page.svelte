<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';

  const metrics = ['Power', 'Heart rate', 'Cadence'];
  const selected = 'Power';
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Compare tracks" />

    <div class="mx-6 mt-[6px] flex gap-[10px]">
      <div
        class="flex flex-1 items-center gap-2 rounded-[12px] px-3 py-[10px]"
        style="background:#eef2ff;"
      >
        <div class="h-[9px] w-[9px] rounded-full" style="background:#6366f1;"></div>
        <div class="text-[13px] font-bold" style="color:#3730a3;">pioneer.fit</div>
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
      {#each metrics as m}
        {#if m === selected}
          <div
            class="flex-1 rounded-[12px] py-[10px] text-center text-[13px] font-extrabold text-white"
            style="background:#6366f1;"
          >
            {m}
          </div>
        {:else}
          <div
            class="flex-1 rounded-[12px] border py-[9px] text-center text-[13px] font-bold"
            style="background:#fff;border-color:#efece6;color:#6b7077;"
          >
            {m}
          </div>
        {/if}
      {/each}
    </div>

    <div
      class="mx-6 mt-[14px] rounded-[20px] border bg-white px-[14px] pb-[10px] pt-[14px]"
      style="border-color:#ece9f6;box-shadow:0 8px 22px rgba(99,102,241,.08);"
    >
      <svg viewBox="0 0 340 130" width="100%" height="130" preserveAspectRatio="none" class="block">
        <g stroke="#f1eff8" stroke-width="1"><path d="M0,32 H340 M0,64 H340 M0,96 H340" /></g>
        <path
          d="M0,86 L24,66 L48,78 L72,46 L96,56 L120,36 L144,62 L168,34 L192,54 L216,40 L240,26 L264,51 L288,38 L312,58 L340,44"
          fill="none"
          stroke="#6366f1"
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
            style="background:#eef2ff;color:#4f46e5;"
          >
            −
          </div>
          <div class="min-w-[46px] text-center text-[15px] font-extrabold" style="color:#3730a3;">+2.4 s</div>
          <div
            class="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[18px] font-extrabold"
            style="background:#eef2ff;color:#4f46e5;"
          >
            ＋
          </div>
        </div>
      </div>
      <div class="relative h-[6px] rounded-[3px]" style="background:#eceaf7;">
        <div class="absolute left-1/2 top-0 bottom-0 w-[8%] rounded-[3px]" style="background:#6366f1;"></div>
        <div
          class="absolute left-[58%] top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style="background:#6366f1;box-shadow:0 2px 6px rgba(99,102,241,.5);"
        ></div>
      </div>
      <div class="mt-[9px] text-[11px] font-semibold" style="color:#9a9eb5;">
        Align signals when devices started at different times
      </div>
    </div>

    <div class="mx-6 mb-4 mt-[14px] flex gap-[10px]">
      <div class="flex-1 rounded-[14px] p-3" style="background:#eef2ff;">
        <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:#7c83c4;">Avg power A</div>
        <div class="text-[20px] font-extrabold" style="color:#3730a3;">248 W</div>
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

  <div class="flex gap-3 px-6 pb-3 pt-2">
    <button
      class="h-[56px] flex-1 rounded-[20px] text-[16px] font-extrabold text-white"
      style="background:#4f46e5;box-shadow:0 12px 26px rgba(79,70,229,.32);"
    >
      Save comparison
    </button>
    <button
      class="h-[56px] w-[56px] rounded-[20px] text-[18px]"
      style="background:#eef2ff;color:#4f46e5;"
      aria-label="Reset"
    >
      ↺
    </button>
  </div>
</div>
