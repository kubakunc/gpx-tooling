<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import RouteMap from '$lib/components/RouteMap.svelte';
  import MapBadge from '$lib/components/MapBadge.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import ActiveFileSelector from '$lib/components/ActiveFileSelector.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import { loadedFiles, addFiles } from '$lib/stores/loadedFiles';
  import { editSession, setFileId, setStartRatio, setEndRatio, resetEditSession } from '$lib/stores/editSession';
  import { fileService } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import { trimGpx } from '$lib/domain/usecases/trim';
  import { totalDistanceMeters, durationSeconds } from '$lib/domain/usecases/stats';
  import { formatKm, formatDuration, exportName } from '$lib/domain/usecases/format';
  import { elevationProfilePoints } from '$lib/domain/usecases/reduceMapping';
  import { serializeGpx } from '$lib/data/serialization/GpxSerializer';

  const t = toolThemes.trim;

  let busy = $state(false);

  // Active file: editSession.fileId if it still exists, else the first loaded.
  let activeFile = $derived(
    $loadedFiles.find((f) => f.id === $editSession.fileId) ?? $loadedFiles[0] ?? null
  );
  let points = $derived(activeFile?.points ?? []);
  let route = $derived(points.map((p) => ({ lat: p.latitude, lon: p.longitude })));

  let start = $derived($editSession.startRatio);
  let end = $derived($editSession.endRatio);

  let kept = $derived(points.length >= 2 ? safeTrim(points, start, end) : []);

  // Compute kept-segment indices the same way trimGpx does, clamped explicitly
  // so labels match the kept segment exactly (no NaN on all-null-time or
  // single-point tracks).
  const idx = (r: number) => Math.min(points.length, Math.max(0, Math.round(r * points.length)));
  let startIdx = $derived(idx(start));
  let endIdx = $derived(idx(end));
  // Elapsed time up to the kept-segment boundaries, measured from the track start.
  let startTime = $derived(formatDuration(durationSeconds(points.slice(0, startIdx))));
  let endTime = $derived(formatDuration(durationSeconds(points.slice(0, endIdx))));
  let keptLabel = $derived(`${formatKm(totalDistanceMeters(kept))} · ${formatDuration(durationSeconds(kept))}`);

  let profile = $derived(elevationProfilePoints(points, 340, 90));

  function safeTrim(pts: typeof points, s: number, e: number) {
    try {
      return trimGpx(pts, s, e);
    } catch {
      return [];
    }
  }

  async function importFile() {
    if (busy) return;
    busy = true;
    try {
      const files = await fileService.pickAndImportGpx();
      if (files.length === 0) return;
      const added = addFiles(files);
      resetEditSession();
      setFileId(added[0].id);
      showToast(`Imported ${files[0].name}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      busy = false;
    }
  }

  async function trimAndSave() {
    if (busy || !activeFile || kept.length < 2) return;
    busy = true;
    try {
      const xml = serializeGpx(kept, 'trimmed');
      const name = exportName(activeFile.name, 'trimmed');
      await fileService.exportAndShare(xml, name);
      showToast('Trimmed file exported', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Trim track" />

    {#if !activeFile}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No file loaded</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import a GPX or FIT file to trim its start and end.
        </p>
        <button
          type="button"
          class="mt-6 flex h-[52px] items-center justify-center gap-2 rounded-[18px] px-7 text-[15px] font-extrabold text-white"
          style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.35)};"
          disabled={busy}
          onclick={importFile}
        >
          {#if busy}<Spinner /> Working…{:else}Import GPX or FIT file{/if}
        </button>
      </div>
    {:else}
      <ActiveFileSelector
        files={$loadedFiles}
        active={activeFile}
        tile={t.tile}
        accent={t.icon}
        title={t.title}
      />

      <div
        class="relative mx-6 mt-3 h-[150px] overflow-hidden rounded-[20px] border"
        style="background:#e8eef4;border-color:#dbe5f0;"
      >
        <RouteMap variant="trim" {route} keptRange={[start, end]} />
        <MapBadge position="left-3 top-3" extraClass="text-[11px] font-extrabold">
          <span style="color:{t.title};">Kept segment</span>
        </MapBadge>
      </div>

      <div
        class="mx-6 mt-3 rounded-[20px] border bg-white px-[14px] pb-3 pt-[14px]"
        style="border-color:#e8eef7;box-shadow:0 8px 22px rgba(59,130,246,.08);"
      >
        <div class="relative h-[96px]">
          <svg viewBox="0 0 340 96" width="100%" height="96" preserveAspectRatio="none" class="block">
            {#if profile}
              <polyline points={profile} fill="none" stroke="#c2d3ea" stroke-width="2" />
            {/if}
          </svg>
          <div class="absolute inset-x-0 bottom-0 top-0" style="left:{start * 100}%;right:{(1 - end) * 100}%;background:{rgba(t.icon, 0.14)};"></div>
        </div>

        <div class="mt-3 flex flex-col gap-3">
          <label class="block">
            <span class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">Start</span>
            <input
              type="range" min="0" max="1" step="0.01" value={start}
              oninput={(e) => setStartRatio(parseFloat((e.currentTarget as HTMLInputElement).value))}
              class="mt-1 w-full" style="accent-color:{t.button};"
            />
          </label>
          <label class="block">
            <span class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">End</span>
            <input
              type="range" min="0" max="1" step="0.01" value={end}
              oninput={(e) => setEndRatio(parseFloat((e.currentTarget as HTMLInputElement).value))}
              class="mt-1 w-full" style="accent-color:{t.button};"
            />
          </label>
        </div>

        <div class="mt-[10px] flex items-center justify-between">
          <div class="rounded-[11px] px-[11px] py-[7px]" style="background:{t.tile};">
            <div class="text-[9px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">From</div>
            <div class="text-[15px] font-extrabold" style="color:{t.title};">{startTime}</div>
          </div>
          <div class="text-center">
            <div class="text-[9px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">Keep</div>
            <div class="text-[15px] font-extrabold" style="color:{t.button};">{keptLabel}</div>
          </div>
          <div class="rounded-[11px] px-[11px] py-[7px] text-right" style="background:{t.tile};">
            <div class="text-[9px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">To</div>
            <div class="text-[15px] font-extrabold" style="color:{t.title};">{endTime}</div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if activeFile}
    <div class="flex gap-3 px-6 pb-3 pt-2">
      <button
        class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white"
        style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.32)};"
        disabled={busy || kept.length < 2}
        onclick={trimAndSave}
      >
        {#if busy}<Spinner /> Working…{:else}Trim &amp; save{/if}
      </button>
      <button
        class="h-[56px] w-[56px] rounded-[20px] text-[18px]"
        style="background:{t.tile};color:{t.button};"
        aria-label="Reset"
        onclick={() => { const id = activeFile?.id ?? null; resetEditSession(); setFileId(id); }}
      >
        ↺
      </button>
    </div>
  {/if}
</div>
