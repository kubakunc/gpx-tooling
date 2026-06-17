<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import ActiveFileSelector from '$lib/components/ActiveFileSelector.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import { loadedFiles, addFiles } from '$lib/stores/loadedFiles';
  import { editSession, setFileId, resetEditSession } from '$lib/stores/editSession';
  import { fileService } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import { repairElevation } from '$lib/domain/usecases/repairElevation';
  import { smoothElevation, elevationFixLevelFromPercent } from '$lib/domain/usecases/smoothElevation';
  import { elevationGainMeters } from '$lib/domain/usecases/stats';
  import { elevationProfilePoints } from '$lib/domain/usecases/reduceMapping';
  import { exportName } from '$lib/domain/usecases/format';
  import { serializeGpx } from '$lib/data/serialization/GpxSerializer';
  import { debounce } from '$lib/util/debounce';
  import type { TrackPoint } from '$lib/domain/entities/TrackPoint';
  import type { SmoothingLevel } from '$lib/domain/usecases/smoothElevation';
  import { adManager } from '$lib/ads/AdManager';

  const t = toolThemes.elevation;
  const LEVEL_LABEL = { low: 'Low', medium: 'Medium', high: 'High' } as const;

  let busy = $state(false);

  // Preload an interstitial as soon as the user has files loaded, so it's ready
  // after export. Reactive (not onMount) to cover the open-empty → import flow;
  // prepareInterstitial is idempotent, so re-runs are safe.
  $effect(() => {
    if ($loadedFiles.length > 0) void adManager.prepareInterstitial();
  });
  let percent = $state(55);

  let activeFile = $derived(
    $loadedFiles.find((f) => f.id === $editSession.fileId) ?? $loadedFiles[0] ?? null
  );
  let points = $derived(activeFile?.points ?? []);

  let level = $derived(elevationFixLevelFromPercent(percent));
  let calculating = $state(false);

  // Debounce the smoothing recompute so dragging the slider doesn't repair +
  // smooth on every pixel. Kept on the main thread (fast), but off the hot path.
  let corrected = $state<TrackPoint[]>([]);
  function recompute(pts: TrackPoint[], lvl: SmoothingLevel) {
    corrected = pts.length ? smoothElevation(repairElevation(pts), lvl) : [];
    calculating = false;
  }
  const debouncedRecompute = debounce(recompute, 150);
  $effect(() => {
    // Don't flash a spinner when there's nothing to compute (no file / no
    // points). Mirror Reduce's graceful empty handling: clear state, no spinner.
    if (points.length === 0) {
      debouncedRecompute.cancel();
      corrected = [];
      calculating = false;
      return;
    }
    calculating = true;
    debouncedRecompute(points, level);
  });

  let gainBefore = $derived(elevationGainMeters(points));
  let gainAfter = $derived(elevationGainMeters(corrected));

  let beforeProfile = $derived(elevationProfilePoints(points, 340, 104));
  let afterProfile = $derived(elevationProfilePoints(corrected, 340, 104));

  let exportFilename = $derived(activeFile ? exportName(activeFile.name, 'elev') : '');

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

  async function applyAndSave() {
    if (busy || calculating || !activeFile || corrected.length === 0) return;
    busy = true;
    try {
      const name = exportFilename;
      const xml = serializeGpx(corrected, name);
      await fileService.exportAndShare(xml, name);
      showToast('Corrected file exported', 'success');
      void adManager.showInterstitialIfReady(() => {});
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Elevation fix" />

    {#if !activeFile}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No file loaded</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import a track to repair its elevation profile and total gain.
        </p>
        <button
          type="button"
          class="mt-6 flex h-[52px] items-center justify-center gap-2 rounded-[18px] px-7 text-[15px] font-extrabold text-white"
          style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.35)};"
          disabled={busy}
          onclick={importFile}
        >
          {#if busy}<Spinner /> Working…{:else}Import file{/if}
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
          {#if beforeProfile}
            <polyline points={beforeProfile} fill="none" stroke="#d6c4a0" stroke-width="2" stroke-dasharray="3 3" />
          {/if}
          {#if afterProfile}
            <polyline points={afterProfile} fill="none" stroke={t.icon} stroke-width="2.6" />
          {/if}
        </svg>
        <div class="mt-[10px] flex justify-between">
          <div>
            <div class="text-[11px]" style="color:#b08b4a;">Gain before</div>
            <div class="text-[20px] font-extrabold line-through" style="color:#a8a29e;">{Math.round(gainBefore)} m</div>
          </div>
          <div class="text-right">
            <div class="flex items-center justify-end gap-1 text-[11px]" style="color:{t.button};">
              Corrected {#if calculating}<Spinner />{/if}
            </div>
            <div class="text-[20px] font-extrabold" style="color:{t.title};">
              {calculating ? '…' : `${Math.round(gainAfter)} m`}
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
        Elevation source
      </div>
      <div class="flex gap-2 px-6 pt-[10px]">
        <div
          class="flex-1 rounded-[13px] text-center text-[13px] font-extrabold"
          style="padding-top:10px;padding-bottom:10px;background:{t.tile};border:2px solid {t.icon};color:{t.title};"
        >
          GPS
        </div>
        <div
          class="relative flex-1 cursor-not-allowed rounded-[13px] border bg-[#faf6ec] text-center text-[13px] font-bold text-[#c2b48f] opacity-50"
          style="padding-top:11px;padding-bottom:11px;border-color:#efece6;"
          aria-disabled="true"
        >
          SRTM
          <span
            class="absolute right-[6px] top-[5px] rounded-full px-[6px] py-[1px] text-[8px] font-bold uppercase tracking-[0.08em]"
            style="background:rgba(255,255,255,0.8);color:#b08b4a;"
          >
            Soon
          </span>
        </div>
        <div
          class="relative flex-1 cursor-not-allowed rounded-[13px] border bg-[#faf6ec] text-center text-[13px] font-bold text-[#c2b48f] opacity-50"
          style="padding-top:11px;padding-bottom:11px;border-color:#efece6;"
          aria-disabled="true"
        >
          Mapbox
          <span
            class="absolute right-[6px] top-[5px] rounded-full px-[6px] py-[1px] text-[8px] font-bold uppercase tracking-[0.08em]"
            style="background:rgba(255,255,255,0.8);color:#b08b4a;"
          >
            Soon
          </span>
        </div>
      </div>
      <div class="px-6 pt-[6px] text-[11px]" style="color:#c2b48f;">
        SRTM &amp; Mapbox online sources — coming soon. GPS uses the track's own elevation.
      </div>

      <div class="mx-6 mb-4 mt-[18px] rounded-[16px] border bg-white px-4 py-[14px]" style="border-color:#efece6;">
        <div class="mb-[10px] flex justify-between">
          <div class="text-[14px] font-bold text-ink">Smoothing</div>
          <div class="text-[13px] font-extrabold" style="color:{t.button};">{LEVEL_LABEL[level]}</div>
        </div>
        <input
          type="range" min="0" max="100" step="1" bind:value={percent}
          class="w-full" style="accent-color:{t.icon};"
        />
        <div class="mt-2 flex justify-between text-[11px] font-semibold" style="color:#c2b48f;">
          <span>Light</span><span>Strong</span>
        </div>
      </div>
    {/if}
  </div>

  {#if activeFile}
    <div class="px-6 pb-5 pt-2">
      <div class="mb-[8px] text-center text-[12px]" style="color:#b08b4a;">
        Saves as: <span class="font-bold">{exportFilename}</span>
      </div>
      <button
        type="button"
        class="flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white"
        style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.3)};"
        disabled={busy || calculating || corrected.length === 0}
        onclick={applyAndSave}
      >
        {#if busy}<Spinner /> Working…{:else if calculating}<Spinner /> Calculating…{:else}Apply correction{/if}
      </button>
    </div>
  {/if}
</div>
