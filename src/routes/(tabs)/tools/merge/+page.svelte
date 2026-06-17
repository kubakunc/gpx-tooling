<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import RouteMap from '$lib/components/RouteMap.svelte';
  import MapBadge from '$lib/components/MapBadge.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import type { LoadedFile } from '$lib/stores/loadedFiles';
  import { loadedFiles, addFiles, removeFile, reorderFiles } from '$lib/stores/loadedFiles';
  import { fileService } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import { mergeChronologically } from '$lib/domain/usecases/merge';
  import { totalDistanceMeters, elevationGainMeters, durationSeconds } from '$lib/domain/usecases/stats';
  import { formatKm, formatGain, formatDuration, exportName } from '$lib/domain/usecases/format';
  import { serializeGpx } from '$lib/data/serialization/GpxSerializer';

  const t = toolThemes.merge;

  let busy = $state(false);

  const rowBg = (i: number) => [t.icon, '#34d399', t.button][i % 3];

  let merged = $derived(mergeChronologically($loadedFiles.map((f) => f.points)));
  let mergedRoute = $derived(
    merged.map((p) => ({ lat: p.latitude, lon: p.longitude }))
  );
  let totalKm = $derived(formatKm(totalDistanceMeters(merged)));
  let totalGain = $derived(formatGain(elevationGainMeters(merged)));

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
    if (busy || $loadedFiles.length === 0) return;
    busy = true;
    try {
      const xml = serializeGpx(merged, 'merged');
      const name = exportName($loadedFiles[0]?.name ?? '', 'merged');
      await fileService.exportAndShare(xml, name);
      showToast('Merged file exported', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      busy = false;
    }
  }

  function fileMeta(points: typeof merged): string {
    return `${formatKm(totalDistanceMeters(points))} · ${formatGain(elevationGainMeters(points))} · ${formatDuration(durationSeconds(points))}`;
  }

  // Toast has no action support, so confirm the removal with a plain toast
  // rather than building an undo affordance the component can't render.
  function removeWithToast(f: LoadedFile) {
    removeFile(f.id);
    showToast(`Removed ${f.name}`, 'info');
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Merge files" />

    {#if $loadedFiles.length === 0}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No files yet</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import two or more GPX files to merge them into a single route.
        </p>
        <button
          type="button"
          class="mt-6 flex h-[52px] items-center justify-center gap-2 rounded-[18px] px-7 text-[15px] font-extrabold text-white"
          style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.35)};"
          disabled={busy}
          onclick={importMore}
        >
          {#if busy}<Spinner /> Working…{:else}Import GPX files{/if}
        </button>
      </div>
    {:else}
      <div
        class="relative mx-6 mt-3 h-[158px] overflow-hidden rounded-[20px] border"
        style="background:#e8eee9;border-color:#dbe7df;"
      >
        <RouteMap variant="merge" route={mergedRoute} />
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

      <div class="flex items-center justify-between px-6 pt-4">
        <div class="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          {$loadedFiles.length} file{$loadedFiles.length === 1 ? '' : 's'} · use ↑ ↓ to reorder
        </div>
        <button
          type="button"
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
          <div
            class="flex items-center gap-[13px] rounded-[18px] border bg-white p-[13px]"
            style="border-color:#eef0ec;box-shadow:0 5px 14px {rgba(t.button, 0.05)};"
          >
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
                  onclick={() => reorderFiles(i, i - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="flex h-10 w-10 items-center justify-center rounded-[11px] text-[15px]"
                  style="background:#f1f3f0;color:{t.button};"
                  aria-label="Move down"
                  disabled={i === $loadedFiles.length - 1}
                  onclick={() => reorderFiles(i, i + 1)}
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
        {/each}
      </div>

      <div class="px-6 pb-4 text-[12px] leading-[1.5]" style="color:#8a9099;">
        Files are stitched together by timestamp.
      </div>
    {/if}
  </div>

  {#if $loadedFiles.length > 0}
    <div class="px-6 pb-3 pt-2">
      <button
        class="flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white"
        style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.35)};"
        disabled={busy}
        onclick={mergeAndExport}
      >
        {#if busy}<Spinner /> Working…{:else}Merge &amp; export{/if}
      </button>
    </div>
  {/if}
</div>
