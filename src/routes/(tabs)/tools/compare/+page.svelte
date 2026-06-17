<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import { loadedFiles } from '$lib/stores/loadedFiles';
  import { fileService } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import {
    COMPARE_METRICS,
    compareTracks,
    buildChartPaths,
    comparisonToCsv,
    type CompareMetric
  } from '$lib/domain/usecases/compare';
  import { formatDuration } from '$lib/domain/usecases/format';

  const t = toolThemes.compare;
  const AMBER = '#f59e0b';

  const metricLabels: Record<CompareMetric, string> = {
    power: 'Power',
    hr: 'Heart rate',
    cadence: 'Cadence'
  };
  const metricUnit: Record<CompareMetric, string> = { power: 'W', hr: 'bpm', cadence: 'rpm' };

  let busy = $state(false);
  let metricIndex = $state(0);
  let shiftSeconds = $state(0);

  // Default A/B selections to the first two loaded files.
  let idA = $state<string | null>(null);
  let idB = $state<string | null>(null);

  $effect(() => {
    const files = $loadedFiles;
    if (files.length >= 1 && (idA === null || !files.some((f) => f.id === idA))) idA = files[0].id;
    if (files.length >= 2 && (idB === null || !files.some((f) => f.id === idB) || idB === idA)) {
      idB = files.find((f) => f.id !== idA)?.id ?? files[1].id;
    }
  });

  let metric = $derived(COMPARE_METRICS[metricIndex]);
  let fileA = $derived($loadedFiles.find((f) => f.id === idA) ?? null);
  let fileB = $derived($loadedFiles.find((f) => f.id === idB) ?? null);
  let ready = $derived($loadedFiles.length >= 2 && !!fileA && !!fileB);

  let result = $derived(
    fileA && fileB
      ? compareTracks(fileA.points, fileB.points, metric, shiftSeconds)
      : { seriesA: [], seriesB: [], avgA: null, avgB: null, diffPercent: null }
  );
  let hasData = $derived(result.seriesA.length > 0 || result.seriesB.length > 0);
  let paths = $derived(buildChartPaths(result.seriesA, result.seriesB, 340, 130));

  let timeMax = $derived(
    Math.max(
      0,
      ...result.seriesA.map((s) => s.t),
      ...result.seriesB.map((s) => s.t)
    )
  );

  const unit = $derived(metricUnit[metric]);
  function fmtAvg(v: number | null): string {
    return v === null ? '—' : `${Math.round(v)} ${unit}`;
  }
  let diffLabel = $derived(
    result.diffPercent === null
      ? '—'
      : `${result.diffPercent >= 0 ? '+' : ''}${result.diffPercent.toFixed(1)}%`
  );

  function adjustShift(delta: number) {
    shiftSeconds = Math.round((shiftSeconds + delta) * 10) / 10;
  }

  function reset() {
    shiftSeconds = 0;
    metricIndex = 0;
  }

  async function saveComparison() {
    if (busy || !ready || !hasData) return;
    busy = true;
    try {
      const csv = comparisonToCsv(result, metric);
      const base = `${(fileA?.name ?? 'a').replace(/\.[^.]+$/, '')}-vs-${(fileB?.name ?? 'b').replace(/\.[^.]+$/, '')}`;
      await fileService.shareTextFile(csv, `${base}-${metric}.csv`);
      showToast('Comparison exported', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Compare tracks" />

    {#if !ready}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">Import two files to compare</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Compare overlays the power, heart-rate or cadence of two tracks. Add at least two files
          from the Files tab.
        </p>
      </div>
    {:else}
      <div class="mx-6 mt-[6px] flex gap-[10px]">
        <label class="flex flex-1 items-center gap-2 rounded-[12px] px-3 py-[10px]" style="background:{t.tile};">
          <span class="h-[9px] w-[9px] shrink-0 rounded-full" style="background:{t.icon};"></span>
          <select
            bind:value={idA}
            class="min-w-0 flex-1 truncate bg-transparent text-[13px] font-bold outline-none"
            style="color:{t.title};"
            aria-label="Track A"
          >
            {#each $loadedFiles as f (f.id)}
              <option value={f.id}>{f.name}</option>
            {/each}
          </select>
        </label>
        <label class="flex flex-1 items-center gap-2 rounded-[12px] px-3 py-[10px]" style="background:#fef3c7;">
          <span class="h-[9px] w-[9px] shrink-0 rounded-full" style="background:{AMBER};"></span>
          <select
            bind:value={idB}
            class="min-w-0 flex-1 truncate bg-transparent text-[13px] font-bold outline-none"
            style="color:#92400e;"
            aria-label="Track B"
          >
            {#each $loadedFiles as f (f.id)}
              <option value={f.id}>{f.name}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="flex gap-2 px-6 pt-[14px]">
        {#each COMPARE_METRICS as m, i (m)}
          <button
            type="button"
            class="flex-1 rounded-[12px] text-center text-[13px]"
            style="padding-top:{i === metricIndex ? 10 : 9}px;padding-bottom:{i === metricIndex ? 10 : 9}px;{i === metricIndex
              ? `background:${t.icon};color:#fff;font-weight:800;`
              : 'background:#fff;color:#6b7077;font-weight:700;border:1px solid #efece6;'}"
            aria-pressed={i === metricIndex}
            onclick={() => (metricIndex = i)}
          >
            {metricLabels[m]}
          </button>
        {/each}
      </div>

      <div
        class="mx-6 mt-[14px] rounded-[20px] border bg-white px-[14px] pb-[10px] pt-[14px]"
        style="border-color:#ece9f6;box-shadow:0 8px 22px {rgba(t.icon, 0.08)};"
      >
        {#if hasData}
          <svg viewBox="0 0 340 130" width="100%" height="130" preserveAspectRatio="none" class="block">
            <g stroke="#f1eff8" stroke-width="1"><path d="M0,32 H340 M0,64 H340 M0,96 H340" /></g>
            {#if paths.a}
              <polyline points={paths.a} fill="none" stroke={t.icon} stroke-width="2.6" />
            {/if}
            {#if paths.b}
              <polyline points={paths.b} fill="none" stroke={AMBER} stroke-width="2.6" />
            {/if}
          </svg>
          <div class="flex justify-between px-[2px] text-[10px] font-semibold" style="color:#a8a29e;">
            <span>00:00</span><span>{formatDuration(timeMax)}</span>
          </div>
        {:else}
          <div class="flex h-[130px] items-center justify-center text-center text-[13px]" style="color:#9a9eb5;">
            Neither track has {metricLabels[metric].toLowerCase()} data.
          </div>
        {/if}
      </div>

      <div class="mx-6 mt-[14px] rounded-[18px] border bg-white px-4 py-[15px]" style="border-color:#ece9f6;">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-[14px] font-bold text-ink">
            Shift <span class="rounded-[6px] px-[6px] py-[1px]" style="color:#b08900;background:#fef3c7;">B</span>
          </div>
          <div class="flex items-center gap-[10px]">
            <button
              type="button"
              class="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[18px] font-extrabold"
              style="background:{t.tile};color:{t.button};"
              aria-label="Shift earlier"
              onclick={() => adjustShift(-0.2)}
            >
              −
            </button>
            <div class="min-w-[60px] text-center text-[15px] font-extrabold" style="color:{t.title};">
              {shiftSeconds >= 0 ? '+' : ''}{shiftSeconds.toFixed(1)} s
            </div>
            <button
              type="button"
              class="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[18px] font-extrabold"
              style="background:{t.tile};color:{t.button};"
              aria-label="Shift later"
              onclick={() => adjustShift(0.2)}
            >
              ＋
            </button>
          </div>
        </div>
        <input
          type="range" min="-30" max="30" step="0.2" bind:value={shiftSeconds}
          class="w-full" style="accent-color:{t.icon};" aria-label="Shift seconds"
        />
        <div class="mt-[9px] text-[11px] font-semibold" style="color:#9a9eb5;">
          Align signals when devices started at different times
        </div>
      </div>

      <div class="mx-6 mb-4 mt-[14px] flex gap-[10px]">
        <div class="flex-1 rounded-[14px] p-3" style="background:{t.tile};">
          <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">Avg A</div>
          <div class="text-[20px] font-extrabold" style="color:{t.title};">{fmtAvg(result.avgA)}</div>
        </div>
        <div class="flex-1 rounded-[14px] p-3" style="background:#fef3c7;">
          <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:#b08900;">Avg B</div>
          <div class="text-[20px] font-extrabold" style="color:#92400e;">{fmtAvg(result.avgB)}</div>
        </div>
        <div class="flex-1 rounded-[14px] p-3" style="background:#f3f1ec;">
          <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:#9a9488;">Difference</div>
          <div class="text-[20px] font-extrabold text-ink">{diffLabel}</div>
        </div>
      </div>
    {/if}
  </div>

  {#if ready}
    <div class="flex gap-3 px-6 pb-3 pt-2">
      <button
        type="button"
        onclick={saveComparison}
        disabled={busy || !hasData}
        class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white"
        style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.32)};"
      >
        {#if busy}<Spinner /> Saving…{:else}Save comparison{/if}
      </button>
      <button
        type="button"
        onclick={reset}
        class="h-[56px] w-[56px] rounded-[20px] text-[18px]"
        style="background:{t.tile};color:{t.button};"
        aria-label="Reset"
      >
        ↺
      </button>
    </div>
  {/if}
</div>
