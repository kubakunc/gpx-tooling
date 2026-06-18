<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import RouteMap from '$lib/components/RouteMap.svelte';
  import MapBadge from '$lib/components/MapBadge.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import ActiveFileSelector from '$lib/components/ActiveFileSelector.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import { loadedFiles, addFiles } from '$lib/stores/loadedFiles';
  import { editSession, setFileId, resetEditSession } from '$lib/stores/editSession';
  import { fileService, savedToDeviceMessage } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import { reverseTrack } from '$lib/domain/usecases/reverse';
  import { exportName } from '$lib/domain/usecases/format';
  import { serializeGpx } from '$lib/data/serialization/GpxSerializer';
  import { adManager } from '$lib/ads/AdManager';

  const t = toolThemes.reverse;

  let busy = $state(false);

  $effect(() => {
    if ($loadedFiles.length > 0) void adManager.prepareInterstitial();
  });

  let activeFile = $derived(
    $loadedFiles.find((f) => f.id === $editSession.fileId) ?? $loadedFiles[0] ?? null
  );
  let points = $derived(activeFile?.points ?? []);
  let reversed = $derived(reverseTrack(points));
  let route = $derived(reversed.map((p) => ({ lat: p.latitude, lon: p.longitude })));

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

  async function reverseAndExport() {
    if (busy || !activeFile || reversed.length < 2) return;
    busy = true;
    try {
      const xml = serializeGpx(reversed, 'reversed');
      const name = exportName(activeFile.name, 'reversed');
      await fileService.exportAndShare(xml, name);
      showToast('Reversed file exported', 'success');
      void adManager.showInterstitialIfReady(() => {});
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      busy = false;
    }
  }

  async function saveToDevice() {
    if (busy || !activeFile || reversed.length < 2) return;
    busy = true;
    try {
      const xml = serializeGpx(reversed, 'reversed');
      const name = exportName(activeFile.name, 'reversed');
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
    <ToolHeader title="Reverse track" />

    {#if !activeFile}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No file loaded</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import a GPX or FIT file to flip its direction.
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
        style="background:#e8f3f1;border-color:#cfeae5;"
      >
        <RouteMap variant="merge" {route} zoomPosition="bottomleft" />
        <MapBadge position="left-3 top-3" extraClass="text-[11px] font-extrabold">
          <span style="color:{t.title};">Reversed route</span>
        </MapBadge>
      </div>

      <div class="mx-6 mt-[14px] rounded-[16px] border bg-white p-4" style="border-color:#e0efec;">
        <p class="text-[13px] leading-[1.5]" style="color:{t.subtitle};">
          The route order is flipped — start and finish swap. Timestamps stay forward-moving
          (rebuilt from the reversed gaps); untimed tracks export without times.
        </p>
      </div>
    {/if}
  </div>

  {#if activeFile}
    <div class="px-6 pb-5 pt-2">
      <div class="flex gap-3">
        <button
          data-testid="reverse-export"
          class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white disabled:opacity-50"
          style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.3)};"
          disabled={busy || reversed.length < 2}
          onclick={reverseAndExport}
        >
          {#if busy}<Spinner /> Working…{:else}Reverse &amp; export{/if}
        </button>
        <button
          data-testid="reverse-save"
          class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] border-2 text-[16px] font-extrabold disabled:opacity-50"
          style="border-color:{t.button};color:{t.button};background:#fff;"
          disabled={busy || reversed.length < 2}
          onclick={saveToDevice}
        >
          {#if busy}<Spinner /> Working…{:else}Save to device{/if}
        </button>
      </div>
    </div>
  {/if}
</div>
