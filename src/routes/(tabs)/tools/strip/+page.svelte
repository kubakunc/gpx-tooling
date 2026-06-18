<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import ActiveFileSelector from '$lib/components/ActiveFileSelector.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import { loadedFiles, addFiles } from '$lib/stores/loadedFiles';
  import { editSession, setFileId, resetEditSession } from '$lib/stores/editSession';
  import { fileService, savedToDeviceMessage } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import { stripTrack } from '$lib/domain/usecases/strip';
  import { exportName, formatBytes } from '$lib/domain/usecases/format';
  import { serializeGpx } from '$lib/data/serialization/GpxSerializer';
  import { adManager } from '$lib/ads/AdManager';

  const t = toolThemes.strip;

  let busy = $state(false);
  let stripSensors = $state(true);
  let stripTimestamps = $state(false);
  let stripElevation = $state(false);

  $effect(() => {
    if ($loadedFiles.length > 0) void adManager.prepareInterstitial();
  });

  let activeFile = $derived(
    $loadedFiles.find((f) => f.id === $editSession.fileId) ?? $loadedFiles[0] ?? null
  );
  let points = $derived(activeFile?.points ?? []);

  let stripped = $derived(
    stripTrack(points, {
      sensors: stripSensors,
      timestamps: stripTimestamps,
      elevation: stripElevation
    })
  );

  let beforeXml = $derived(points.length ? serializeGpx(points, 'orig') : '');
  let afterXml = $derived(points.length ? serializeGpx(stripped, 'stripped') : '');
  let beforeBytes = $derived(new TextEncoder().encode(beforeXml).length);
  let afterBytes = $derived(new TextEncoder().encode(afterXml).length);
  let savedPct = $derived(
    beforeBytes > 0 ? Math.max(0, Math.round((1 - afterBytes / beforeBytes) * 100)) : 0
  );

  const rows = [
    { key: 'sensors', label: 'Sensor data', hint: 'Heart rate, cadence, power' },
    { key: 'timestamps', label: 'Timestamps', hint: 'Removes all <time> tags' },
    { key: 'elevation', label: 'Elevation', hint: 'Removes all <ele> tags' }
  ] as const;

  function toggle(key: 'sensors' | 'timestamps' | 'elevation') {
    if (key === 'sensors') stripSensors = !stripSensors;
    else if (key === 'timestamps') stripTimestamps = !stripTimestamps;
    else stripElevation = !stripElevation;
  }

  function isOn(key: 'sensors' | 'timestamps' | 'elevation'): boolean {
    if (key === 'sensors') return stripSensors;
    if (key === 'timestamps') return stripTimestamps;
    return stripElevation;
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

  async function stripAndExport() {
    if (busy || !activeFile) return;
    busy = true;
    try {
      const name = exportName(activeFile.name, 'stripped');
      await fileService.exportAndShare(afterXml, name);
      showToast('Stripped file exported', 'success');
      void adManager.showInterstitialIfReady(() => {});
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      busy = false;
    }
  }

  async function saveToDevice() {
    if (busy || !activeFile) return;
    busy = true;
    try {
      const name = exportName(activeFile.name, 'stripped');
      await fileService.saveToDevice(afterXml, name);
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
    <ToolHeader title="Strip & minify" />

    {#if !activeFile}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No file loaded</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import a GPX or FIT file to remove data and shrink it.
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
        class="mx-6 mt-3 flex gap-3 rounded-[18px] border bg-white p-4"
        style="border-color:#eef0f2;box-shadow:0 5px 14px {rgba(t.button, 0.06)};"
      >
        <div class="flex-1 rounded-[14px] p-3" style="background:{t.tile};">
          <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">
            Size
          </div>
          <div data-testid="strip-size" class="mt-[2px] text-[18px] font-extrabold" style="color:{t.title};">
            <span style="color:#94a3b8;">{formatBytes(beforeBytes)}</span> → {formatBytes(afterBytes)}
          </div>
        </div>
        <div class="flex-1 rounded-[14px] p-3" style="background:{t.tile};">
          <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">
            Saved
          </div>
          <div data-testid="strip-saved" class="mt-[2px] text-[18px] font-extrabold" style="color:{t.button};">
            {savedPct}%
          </div>
        </div>
      </div>

      <div class="mx-6 mt-[14px] flex flex-col gap-[10px]">
        {#each rows as row (row.key)}
          <button
            type="button"
            data-testid="strip-toggle-{row.key}"
            class="flex items-center justify-between rounded-[16px] border bg-white p-4 text-left"
            style="border-color:#eef0f2;"
            aria-pressed={isOn(row.key)}
            onclick={() => toggle(row.key)}
          >
            <div>
              <div class="text-[14px] font-bold text-ink">{row.label}</div>
              <div class="text-[12px]" style="color:#8a9099;">{row.hint}</div>
            </div>
            <Toggle on={isOn(row.key)} accent={t.button} />
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if activeFile}
    <div class="px-6 pb-5 pt-2">
      <div class="flex gap-3">
        <button
          data-testid="strip-export"
          class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white disabled:opacity-50"
          style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.3)};"
          disabled={busy}
          onclick={stripAndExport}
        >
          {#if busy}<Spinner /> Working…{:else}Strip &amp; export{/if}
        </button>
        <button
          data-testid="strip-save"
          class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] border-2 text-[16px] font-extrabold disabled:opacity-50"
          style="border-color:{t.button};color:{t.button};background:#fff;"
          disabled={busy}
          onclick={saveToDevice}
        >
          {#if busy}<Spinner /> Working…{:else}Save to device{/if}
        </button>
      </div>
    </div>
  {/if}
</div>
