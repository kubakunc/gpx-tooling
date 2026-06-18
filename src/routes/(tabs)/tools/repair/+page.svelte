<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import RouteMap from '$lib/components/RouteMap.svelte';
  import MapBadge from '$lib/components/MapBadge.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import ActiveFileSelector from '$lib/components/ActiveFileSelector.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import { loadedFiles, addFiles } from '$lib/stores/loadedFiles';
  import { editSession, setFileId, resetEditSession } from '$lib/stores/editSession';
  import { fileService, savedToDeviceMessage } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import { repairTrack, type RepairStrength } from '$lib/domain/usecases/repairFile';
  import { exportName, formatCount } from '$lib/domain/usecases/format';
  import { serializeGpx } from '$lib/data/serialization/GpxSerializer';
  import { adManager } from '$lib/ads/AdManager';

  const t = toolThemes.repair;

  let busy = $state(false);
  const STRENGTHS: RepairStrength[] = ['conservative', 'balanced', 'aggressive'];
  const LABELS = ['Conservative', 'Balanced', 'Aggressive'];
  let strengthIndex = $state(1); // Balanced default
  let strength = $derived(STRENGTHS[strengthIndex]);

  $effect(() => {
    if ($loadedFiles.length > 0) void adManager.prepareInterstitial();
  });

  let activeFile = $derived(
    $loadedFiles.find((f) => f.id === $editSession.fileId) ?? $loadedFiles[0] ?? null
  );
  let points = $derived(activeFile?.points ?? []);
  let result = $derived(repairTrack(points, { strength }));
  // Original (faint) vs cleaned overlay, like Reduce's original/simplified.
  let originalCoords = $derived(points.map((p) => ({ lat: p.latitude, lon: p.longitude })));
  let cleanedCoords = $derived(result.points.map((p) => ({ lat: p.latitude, lon: p.longitude })));

  // Qualitative helper that changes with the selected strength. Aggressive is a
  // warning because it moves the recorded coordinates.
  let strengthHelp = $derived(
    strength === 'conservative'
      ? 'Removes only clearly-impossible GPS jumps.'
      : strength === 'balanced'
        ? 'Removes GPS jumps and fixes elevation spikes.'
        : 'Also smooths GPS jitter — this moves your recorded coordinates.'
  );

  // Friendly report: lead with a total, then a per-category breakdown. Elevation
  // repair doesn't run under Conservative, so hide that (misleading) 0 stat.
  let showElevation = $derived(strength !== 'conservative');
  let totalFixed = $derived(
    result.report.spikes +
      result.report.invalid +
      result.report.duplicates +
      (showElevation ? result.report.elevationFixed : 0)
  );
  let reportBreakdown = $derived(
    [
      `${formatCount(result.report.spikes)} spikes`,
      `${formatCount(result.report.invalid)} invalid`,
      `${formatCount(result.report.duplicates)} duplicates`,
      ...(showElevation ? [`${formatCount(result.report.elevationFixed)} elevations fixed`] : [])
    ].join(' · ')
  );

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

  async function repairAndExport() {
    if (busy || !activeFile || result.points.length < 1) return;
    busy = true;
    try {
      const xml = serializeGpx(result.points, 'repaired');
      const name = exportName(activeFile.name, 'repaired');
      await fileService.exportAndShare(xml, name);
      showToast('Repaired file exported', 'success');
      void adManager.showInterstitialIfReady(() => {});
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      busy = false;
    }
  }

  async function saveToDevice() {
    if (busy || !activeFile || result.points.length < 1) return;
    busy = true;
    try {
      const xml = serializeGpx(result.points, 'repaired');
      const name = exportName(activeFile.name, 'repaired');
      await fileService.saveToDevice(xml, name);
      showToast(savedToDeviceMessage(name), 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Repair file" />

    {#if !activeFile}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No file loaded</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import a GPX or FIT file to clean GPS spikes & errors.
        </p>
        <button
          type="button"
          data-testid="import-button"
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
        class="relative mx-6 mt-3 h-[340px] overflow-hidden rounded-[20px] border"
        style="background:#f6e9ec;border-color:#f4d4db;"
      >
        <RouteMap
          variant="reduce"
          route={originalCoords}
          simplified={cleanedCoords}
          zoomPosition="bottomleft"
        />
        <MapBadge position="left-3 top-3" extraClass="text-[11px] font-extrabold">
          <span style="color:{t.title};">Cleaned route</span>
        </MapBadge>
        <MapBadge
          position="bottom-[10px] left-3"
          extraClass="flex items-center gap-[10px] text-[11px] font-bold"
        >
          <span class="flex items-center gap-[5px]" style="color:#9a8fc0;">
            <span class="inline-block h-[3px] w-3 rounded-[2px]" style="background:#cdbfe8;"></span
            >original
          </span>
          <span class="flex items-center gap-[5px]" style="color:{t.title};">
            <span class="inline-block h-[3px] w-3 rounded-[2px]" style="background:{t.icon};"></span
            >cleaned
          </span>
        </MapBadge>
      </div>

      <!-- Strength control -->
      <div class="px-6 pt-4">
        <div class="mb-2 text-[12px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">
          Strength
        </div>
        <div data-testid="repair-strength" class="flex gap-2">
          {#each LABELS as label, i (label)}
            <button
              type="button"
              data-testid="repair-strength-{STRENGTHS[i]}"
              class="flex-1"
              aria-pressed={strengthIndex === i}
              onclick={() => (strengthIndex = i)}
            >
              <SegmentedControl
                options={[label]}
                selectedIndex={strengthIndex === i ? 0 : -1}
                radius={13}
                selectedBg={t.button}
                selectedText="#ffffff"
                selectedPadY={9}
                unselectedPadY={9}
                textSize={13}
              />
            </button>
          {/each}
        </div>
        {#if strength === 'aggressive'}
          <div
            data-testid="repair-strength-help"
            class="mt-2 flex items-start gap-2 rounded-[12px] border px-3 py-2 text-[12px] font-semibold leading-[1.45]"
            style="border-color:#fcd9c0;background:#fff4ec;color:#b45309;"
          >
            <span aria-hidden="true">⚠</span>
            <span>{strengthHelp}</span>
          </div>
        {:else}
          <p
            data-testid="repair-strength-help"
            class="mt-2 text-[12px] leading-[1.45]"
            style="color:{t.subtitle};"
          >
            {strengthHelp}
          </p>
        {/if}
      </div>

      <!-- Report -->
      <div
        class="mx-6 mt-[14px] rounded-[18px] border bg-white p-4"
        style="border-color:#f4dde2;box-shadow:0 5px 14px {rgba(t.button, 0.06)};"
      >
        <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">
          Cleaned
        </div>
        <div data-testid="repair-report" class="mt-[2px] text-[14px] font-bold" style="color:{t.title};">
          {#if totalFixed === 0}
            Looks clean — no problems found.
          {:else}
            Cleaned {formatCount(totalFixed)} issue{totalFixed === 1 ? '' : 's'}
            <div class="mt-[2px] text-[12px] font-semibold" style="color:#9aa0a6;">
              {reportBreakdown}
            </div>
          {/if}
        </div>
        <div class="mt-1 text-[12px]" style="color:#9aa0a6;">
          {formatCount(points.length)} → {formatCount(result.points.length)} points
        </div>
        <p data-testid="repair-reassurance" class="mt-2 text-[12px]" style="color:#9aa0a6;">
          Your original file is unchanged.
        </p>
      </div>
    {/if}
  </div>

  {#if activeFile}
    <div class="px-6 pb-5 pt-2">
      <div class="flex gap-3">
        <button
          data-testid="repair-export"
          class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white disabled:opacity-50"
          style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.3)};"
          disabled={busy || result.points.length < 1}
          onclick={repairAndExport}
        >
          {#if busy}<Spinner /> Working…{:else}Repair &amp; export{/if}
        </button>
        <button
          data-testid="repair-save"
          class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] border-2 text-[16px] font-extrabold disabled:opacity-50"
          style="border-color:{t.button};color:{t.button};background:#fff;"
          disabled={busy || result.points.length < 1}
          onclick={saveToDevice}
        >
          {#if busy}<Spinner /> Working…{:else}Save to device{/if}
        </button>
      </div>
    </div>
  {/if}
</div>
