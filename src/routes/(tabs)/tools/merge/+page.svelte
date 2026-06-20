<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import RouteMap from '$lib/components/RouteMap.svelte';
  import MapBadge from '$lib/components/MapBadge.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import type { TrackPoint } from '$lib/domain/entities/TrackPoint';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import type { LoadedFile } from '$lib/stores/loadedFiles';
  import { loadedFiles, addFiles, removeFile, reorderFiles } from '$lib/stores/loadedFiles';
  import { fileService, savedToDeviceMessage } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import {
    totalDistanceMeters,
    elevationGainMeters,
    durationSeconds
  } from '$lib/domain/usecases/stats';
  import { formatDistance, formatGain, formatDuration, formatCount, formatClock, formatSpeed, exportName } from '$lib/domain/usecases/format';
  import { settings } from '$lib/stores/settings';
  import {
    analyzeMerge,
    fileStartMs,
    fileEndMs,
    type MergeMode,
    type MergeIssue
  } from '$lib/domain/usecases/mergeEngine';
  import { serializeGpxSegments } from '$lib/data/serialization/GpxSerializer';
  import { adManager } from '$lib/ads/AdManager';

  const t = toolThemes.merge;

  let busy = $state(false);
  let mode = $state<MergeMode>('smart');
  let forceContinuous = $state(false);
  // Per-file time shift (seconds), keyed by the file's current index.
  let shifts = $state<Record<number, number>>({});

  // Preload an interstitial as soon as the user has files loaded, so it's ready
  // after export. Reactive (not onMount) to cover the open-empty → import flow;
  // prepareInterstitial is idempotent, so re-runs are safe.
  $effect(() => {
    if ($loadedFiles.length > 0) void adManager.prepareInterstitial();
  });

  const rowBg = (i: number) => [t.icon, '#34d399', t.button][i % 3];

  let result = $derived(
    analyzeMerge(
      $loadedFiles.map((f) => ({ name: f.name, points: f.points })),
      { mode, forceContinuous, timeShiftSecondsByIndex: shifts }
    )
  );
  let mapSegments = $derived(
    result.segments.map((seg) => seg.map((p) => ({ lat: p.latitude, lon: p.longitude })))
  );
  let totalKm = $derived(formatDistance(result.stats.distanceM, $settings.units));
  let totalGain = $derived(formatGain(result.stats.gainM, $settings.units));

  // Overlap issue (if any) keyed by the file index it applies to.
  function overlapFor(i: number): MergeIssue | undefined {
    return result.issues.find((iss) => iss.kind === 'overlap' && iss.fileIndex === i);
  }

  const issueColor: Record<MergeIssue['kind'], string> = {
    overlap: '#f59e0b',
    gap: '#3b82f6',
    teleport: '#e11d48',
    duplicate: '#8b5cf6'
  };

  // Split issues into action-needed (overlap) vs auto-handled (gap/teleport/duplicate).
  let attentionIssues = $derived(result.issues.filter((iss) => iss.kind === 'overlap'));
  let handledIssues = $derived(result.issues.filter((iss) => iss.kind !== 'overlap'));

  async function importMore() {
    if (busy) return;
    busy = true;
    try {
      const files = await fileService.pickAndImportGpx();
      if (files.length === 0) return;
      addFiles(files);
      showToast(`Imported ${files.length} file${files.length === 1 ? '' : 's'}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      busy = false;
    }
  }

  async function mergeAndExport() {
    if (busy || $loadedFiles.length < 2) return;
    busy = true;
    try {
      const xml = serializeGpxSegments(result.segments, 'merged');
      const name = exportName($loadedFiles[0]?.name ?? '', 'merged');
      await fileService.exportAndShare(xml, name);
      showToast('Merged file shared', 'success');
      // Only after a successful export, never mid-operation.
      void adManager.showInterstitialIfReady(() => {});
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Share failed', 'error');
    } finally {
      busy = false;
    }
  }

  async function saveToDevice() {
    if (busy || $loadedFiles.length < 2) return;
    busy = true;
    try {
      const xml = serializeGpxSegments(result.segments, 'merged');
      const name = exportName($loadedFiles[0]?.name ?? '', 'merged');
      const res = await fileService.saveToDevice(xml, name);
      if (res.saved) showToast(savedToDeviceMessage(name), 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      busy = false;
    }
  }

  function fileMeta(points: TrackPoint[]): string {
    return `${formatClock(fileStartMs(points))} · ${formatDistance(totalDistanceMeters(points), $settings.units)} · ${formatGain(elevationGainMeters(points), $settings.units)} · ${formatDuration(durationSeconds(points))}`;
  }

  // Shift file `i` so its (shifted) start lands ~1s after the CHRONOLOGICAL
  // predecessor's (shifted) end — the one-tap "fix overlap" affordance. In smart
  // mode the predecessor is the file ordered just before `i` per orderedIndices,
  // not the list neighbor.
  function shiftAfterPrevious(i: number) {
    const orderPos = result.orderedIndices.indexOf(i);
    if (orderPos <= 0) return; // first in order (or not found) → nothing to do
    const prevIndex = result.orderedIndices[orderPos - 1];
    const cur = $loadedFiles[i];
    const prev = $loadedFiles[prevIndex];
    if (!cur || !prev) return;
    const curStart = fileStartMs(cur.points);
    const prevEnd = fileEndMs(prev.points);
    if (curStart === null || prevEnd === null) return;
    const prevShift = shifts[prevIndex] ?? 0;
    const desiredStart = prevEnd + prevShift * 1000 + 1000; // 1s after prev shifted end
    const deltaSec = Math.round((desiredStart - curStart) / 1000);
    shifts = { ...shifts, [i]: deltaSec };
  }

  function nudgeShift(i: number, deltaSec: number) {
    shifts = { ...shifts, [i]: (shifts[i] ?? 0) + deltaSec };
  }

  function shiftLabel(sec: number): string {
    const sign = sec >= 0 ? '+' : '−';
    return `${sign}${formatDuration(Math.abs(sec))}`;
  }

  // Removing or reordering files invalidates index-keyed shifts; clear them so a
  // shift never silently applies to the wrong file after the list changes.
  function clearShifts() {
    shifts = {};
  }

  function removeWithToast(f: LoadedFile) {
    removeFile(f.id);
    clearShifts();
    showToast(`Removed ${f.name}`, 'info');
  }

  function reorder(from: number, to: number) {
    reorderFiles(from, to);
    clearShifts();
  }

</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Merge files" />

    {#if $loadedFiles.length === 0}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No files yet</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import two or more GPX or FIT files to merge them into a single route.
        </p>
        <button
          type="button"
          data-testid="import-button"
          class="mt-6 flex h-[52px] items-center justify-center gap-2 rounded-[18px] px-7 text-[15px] font-extrabold text-white"
          style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.35)};"
          disabled={busy}
          onclick={importMore}
        >
          {#if busy}<Spinner /> Working…{:else}Import GPX or FIT files{/if}
        </button>
      </div>
    {:else}
      <div
        class="relative mx-6 mt-3 h-[340px] overflow-hidden rounded-[20px] border"
        style="background:#e8eee9;border-color:#dbe7df;"
      >
        <RouteMap variant="merge" segments={mapSegments} zoomPosition="bottomleft" />
        <MapBadge position="left-3 top-3" extraClass="text-[11px] font-extrabold">
          <span style="color:{t.title};">Merged route</span>
        </MapBadge>
        <MapBadge position="right-3 top-3" extraClass="flex gap-3">
          <div>
            <span class="text-[14px] font-extrabold" style="color:{t.title};">{totalKm}</span>
          </div>
          <div>
            <span class="text-[14px] font-extrabold" style="color:{t.title};">{totalGain}</span>
          </div>
        </MapBadge>
      </div>

      <!-- Mode + force-continuous controls -->
      <div data-testid="merge-mode" class="flex items-center justify-between px-6 pt-4">
        <div
          class="flex overflow-hidden rounded-[12px] border text-[13px] font-bold"
          style="border-color:#dfe6e2;"
        >
          <button
            type="button"
            data-testid="merge-mode-smart"
            class="px-3 py-[7px]"
            aria-pressed={mode === 'smart'}
            style={mode === 'smart'
              ? `background:${t.button};color:#fff;`
              : 'background:#fff;color:#6b7077;'}
            onclick={() => (mode = 'smart')}>Smart</button
          >
          <button
            type="button"
            data-testid="merge-mode-sequential"
            class="px-3 py-[7px]"
            aria-pressed={mode === 'sequential'}
            style={mode === 'sequential'
              ? `background:${t.button};color:#fff;`
              : 'background:#fff;color:#6b7077;'}
            onclick={() => (mode = 'sequential')}>Sequential</button
          >
        </div>
        <button
          type="button"
          data-testid="merge-force-continuous"
          class="flex items-center gap-2 bg-transparent p-0"
          aria-pressed={forceContinuous}
          onclick={() => (forceContinuous = !forceContinuous)}
        >
          <span class="text-[12px] font-semibold" style="color:#6b7077;">Force continuous</span>
          <Toggle on={forceContinuous} accent={t.button} />
        </button>
      </div>
      <div data-testid="merge-mode-caption" class="px-6 pt-1 text-[11px]" style="color:#9aa0a6;">
        {mode === 'smart' ? 'Auto-orders files by start time.' : 'Keeps your order above.'}
      </div>
      <div class="px-6 pt-1 text-[11px]" style="color:#9aa0a6;">
        {forceContinuous ? 'One continuous segment (no splits).' : 'Split at gaps > 100 m.'}
      </div>

      <!-- Analysis panel -->
      <div
        data-testid="merge-analysis"
        class="mx-6 mt-4 rounded-[18px] border bg-white p-4"
        style="border-color:#eef0ec;box-shadow:0 5px 14px {rgba(t.button, 0.05)};"
      >
        <div class="grid grid-cols-3 gap-x-1 gap-y-3 text-center">
          {#each [['Distance', totalKm], ['Gain', totalGain], ['Duration', formatDuration(result.stats.durationS)], ['Avg speed', formatSpeed(result.stats.avgSpeedKmh, $settings.units)]] as [label, value] (label)}
            <div>
              <div
                class="text-[13px] font-extrabold"
                style="color:{t.title};"
                data-testid={label === 'Avg speed' ? 'merge-stat-avgspeed' : undefined}
              >
                {value}
              </div>
              <div class="text-[10px] uppercase tracking-[0.08em]" style="color:#9aa0a6;">
                {label}
              </div>
            </div>
          {/each}
          <div>
            <div
              data-testid="merge-stat-segments"
              class="text-[13px] font-extrabold"
              style="color:{t.title};"
            >
              {result.stats.segmentCount}
            </div>
            <div class="text-[10px] uppercase tracking-[0.08em]" style="color:#9aa0a6;">Segments</div>
          </div>
          <div>
            <div
              data-testid="merge-stat-points"
              class="text-[13px] font-extrabold"
              style="color:{t.title};"
            >
              {formatCount(result.stats.points)}
            </div>
            <div class="text-[10px] uppercase tracking-[0.08em]" style="color:#9aa0a6;">Points</div>
          </div>
        </div>

        <div class="mt-3 flex flex-col gap-[10px] border-t pt-3" style="border-color:#f1f3f0;">
          {#if result.issues.length === 0}
            <div class="text-[12px]" style="color:#9aa0a6;">No issues detected.</div>
          {:else}
            {#if attentionIssues.length > 0}
              <div class="flex flex-col gap-[6px]">
                <div
                  class="text-[10px] font-bold uppercase tracking-[0.08em]"
                  style="color:#92400e;"
                >
                  Needs your attention
                </div>
                {#each attentionIssues as issue, idx (idx)}
                  <div data-testid="merge-issue" class="flex items-start gap-2 text-[12px]">
                    <span
                      class="mt-[5px] h-2 w-2 shrink-0 rounded-full"
                      style="background:{issueColor[issue.kind]};"
                    ></span>
                    <span style="color:#5b6168;">{issue.message}</span>
                  </div>
                {/each}
              </div>
            {/if}
            {#if handledIssues.length > 0}
              <div class="flex flex-col gap-[6px]">
                <div
                  class="text-[10px] font-bold uppercase tracking-[0.08em]"
                  style="color:#9aa0a6;"
                >
                  Handled automatically
                </div>
                {#each handledIssues as issue, idx (idx)}
                  <div data-testid="merge-issue" class="flex items-start gap-2 text-[12px]">
                    <span
                      class="mt-[5px] h-2 w-2 shrink-0 rounded-full"
                      style="background:{issueColor[issue.kind]};"
                    ></span>
                    <span style="color:#5b6168;">{issue.message}</span>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      </div>

      <div class="flex items-center justify-between px-6 pt-4">
        <div class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          {$loadedFiles.length} file{$loadedFiles.length === 1 ? '' : 's'} · use ↑ ↓ to reorder
        </div>
        <button
          type="button"
          data-testid="add-button"
          class="bg-transparent p-0 text-[12px] font-extrabold leading-none"
          style="color:{t.button};"
          disabled={busy}
          onclick={importMore}
        >
          ＋ Add
        </button>
      </div>

      <div class="flex flex-col gap-[10px] px-6 pb-4 pt-[10px]">
        {#each $loadedFiles as f, i (f.id)}
          {@const overlap = overlapFor(i)}
          {@const shift = shifts[i] ?? 0}
          <div
            data-testid="file-row"
            class="flex flex-col gap-[10px] rounded-[18px] border bg-white p-[13px]"
            style="border-color:#eef0ec;box-shadow:0 5px 14px {rgba(t.button, 0.05)};"
          >
            <div class="flex items-center gap-[13px]">
              <div
                class="flex h-9 w-9 items-center justify-center rounded-[11px] text-[15px] font-extrabold text-white"
                style="background:{rowBg(i)};"
              >
                {i + 1}
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[15px] font-bold text-ink">{f.name}</div>
                <div class="text-[12px]" style="color:#8a9099;">{fileMeta(f.points)}</div>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded-[11px] text-[15px]"
                    style="background:#f1f3f0;color:{t.button};"
                    aria-label="Move up"
                    disabled={i === 0}
                    onclick={() => reorder(i, i - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded-[11px] text-[15px]"
                    style="background:#f1f3f0;color:{t.button};"
                    aria-label="Move down"
                    disabled={i === $loadedFiles.length - 1}
                    onclick={() => reorder(i, i + 1)}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  class="flex h-10 w-10 items-center justify-center rounded-[11px] text-[15px]"
                  style="background:#fef2f2;color:#e11d48;"
                  aria-label="Remove file"
                  onclick={() => removeWithToast(f)}
                >
                  ✕
                </button>
              </div>
            </div>

            {#if i > 0}
              <div
                data-testid="merge-overlap-row"
                class="flex flex-wrap items-center gap-2 border-t pt-[10px]"
                style="border-color:#f5f0e6;"
              >
                {#if overlap}
                  <span
                    class="rounded-full px-2 py-[3px] text-[11px] font-bold"
                    style="background:#fef3c7;color:#92400e;">Overlaps previous</span
                  >
                  <button
                    type="button"
                    data-testid="merge-shift"
                    class="rounded-full px-3 py-[5px] text-[11px] font-extrabold text-white"
                    style="background:{t.button};"
                    onclick={() => shiftAfterPrevious(i)}
                  >
                    Shift after previous
                  </button>
                {/if}
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Shift earlier"
                    class="flex h-7 w-7 items-center justify-center rounded-[9px] text-[14px]"
                    style="background:#f1f3f0;color:{t.button};"
                    onclick={() => nudgeShift(i, -5)}>−</button
                  >
                  <button
                    type="button"
                    aria-label="Shift later"
                    class="flex h-7 w-7 items-center justify-center rounded-[9px] text-[14px]"
                    style="background:#f1f3f0;color:{t.button};"
                    onclick={() => nudgeShift(i, 5)}>＋</button
                  >
                  {#if shift !== 0}
                    <span
                      class="text-[11px] font-bold"
                      style="color:#6b7077;"
                      aria-live="polite">{shiftLabel(shift)}</span
                    >
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if $loadedFiles.length > 0}
    <div class="px-6 pb-5 pt-2">
      {#if $loadedFiles.length < 2}
        <div class="pb-[10px] text-center text-[12px] font-semibold" style="color:#8a9099;">
          Add another file to merge.
        </div>
      {/if}
      <div class="flex gap-3">
        <button
          data-testid="merge-export"
          class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white disabled:opacity-50"
          style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.35)};"
          disabled={busy || $loadedFiles.length < 2}
          onclick={mergeAndExport}
        >
          {#if busy}<Spinner /> Working…{:else}Share{/if}
        </button>
        <button
          data-testid="merge-save"
          class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] border-2 text-[16px] font-extrabold disabled:opacity-50"
          style="border-color:{t.button};color:{t.button};background:#fff;"
          disabled={busy || $loadedFiles.length < 2}
          onclick={saveToDevice}
        >
          {#if busy}<Spinner /> Working…{:else}Save{/if}
        </button>
      </div>
    </div>
  {/if}
</div>
