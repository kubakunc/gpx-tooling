<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import RouteMap from '$lib/components/RouteMap.svelte';
  import MapBadge from '$lib/components/MapBadge.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import ActiveFileSelector from '$lib/components/ActiveFileSelector.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import type { TrackPoint } from '$lib/domain/entities/TrackPoint';
  import { loadedFiles, addFiles } from '$lib/stores/loadedFiles';
  import { editSession, setFileId, setEpsilon, resetEditSession } from '$lib/stores/editSession';
  import { fileService, savedToDeviceMessage } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import { percentToEpsilon, simplificationLabel } from '$lib/domain/usecases/reduceMapping';
  import { formatCount, formatBytes, exportName } from '$lib/domain/usecases/format';
  import { serializeGpx } from '$lib/data/serialization/GpxSerializer';
  import { gpxWorkerClient } from '$lib/workers/gpxWorkerClient';
  import { debounce } from '$lib/util/debounce';
  import { adManager } from '$lib/ads/AdManager';
  import { analytics } from '$lib/analytics/analytics';
  import { onMount } from 'svelte';

  const t = toolThemes.reduce;

  onMount(() => {
    void analytics.toolOpen('reduce');
  });

  let busy = $state(false);
  let calculating = $state(false);

  // Preload an interstitial as soon as the user has files loaded, so it's ready
  // after export. Reactive (not onMount) to cover the open-empty → import flow;
  // prepareInterstitial is idempotent, so re-runs are safe.
  $effect(() => {
    if ($loadedFiles.length > 0) void adManager.prepareInterstitial();
  });
  // "Detail kept" percentage (0–100); maps to epsilon via percentToEpsilon.
  // Default to a sensible Medium.
  let percent = $state(50);

  let activeFile = $derived(
    $loadedFiles.find((f) => f.id === $editSession.fileId) ?? $loadedFiles[0] ?? null
  );
  let points = $derived(activeFile?.points ?? []);
  let route = $derived(points.map((p) => ({ lat: p.latitude, lon: p.longitude })));

  let epsilon = $derived(percentToEpsilon(percent));

  // Heavy work (RDP + serialize) runs off the main thread via the worker client
  // (sync fallback when no Worker). Debounced so dragging the slider doesn't
  // recompute per pixel. A request token guards against out-of-order results.
  let reduced = $state<TrackPoint[]>([]);
  let afterXml = $state('');
  let simplified = $derived(reduced.map((p) => ({ lat: p.latitude, lon: p.longitude })));

  let beforeXml = $derived(points.length ? serializeGpx(points, 'orig') : '');
  let beforeBytes = $derived(new TextEncoder().encode(beforeXml).length);
  let afterBytes = $derived(new TextEncoder().encode(afterXml).length);

  let detailLabel = $derived(simplificationLabel(percent));

  let recomputeToken = 0;
  async function recompute(pts: TrackPoint[], eps: number) {
    const token = ++recomputeToken;
    if (pts.length === 0) {
      reduced = [];
      afterXml = '';
      calculating = false;
      return;
    }
    calculating = true;
    try {
      const out = await gpxWorkerClient.runSimplify(pts, eps);
      const xml = await gpxWorkerClient.runSerialize(out, 'reduced', 'gpx');
      if (token !== recomputeToken) return; // a newer request superseded this one
      reduced = out;
      afterXml = xml;
    } catch (e) {
      if (token !== recomputeToken) return;
      showToast(e instanceof Error ? e.message : 'Reduce failed', 'error');
    } finally {
      if (token === recomputeToken) calculating = false;
    }
  }

  const debouncedRecompute = debounce(
    (pts: TrackPoint[], eps: number) => void recompute(pts, eps),
    180
  );

  $effect(() => {
    debouncedRecompute(points, epsilon);
  });

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
      void analytics.fileImport('reduce', files[0]?.name.toLowerCase().endsWith('.fit') ? 'fit' : 'gpx', files.length);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      busy = false;
    }
  }

  async function shareReduced() {
    const file = activeFile;
    if (busy || calculating || !file || reduced.length < 2) return;
    busy = true;
    try {
      // Keep epsilon in the shared edit session for continuity.
      setEpsilon(epsilon);
      const name = exportName(file.name, 'reduced');
      await fileService.exportAndShare(afterXml, name);
      showToast('Reduced file shared', 'success');
      void analytics.fileShare('reduce', 'gpx');
      void adManager.showInterstitialIfReady(() => {});
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Share failed', 'error');
    } finally {
      busy = false;
    }
  }

  async function saveReduced() {
    const file = activeFile;
    if (busy || calculating || !file || reduced.length < 2) return;
    busy = true;
    try {
      setEpsilon(epsilon);
      const name = exportName(file.name, 'reduced');
      const res = await fileService.saveToDevice(afterXml, name);
      if (res.saved) showToast(savedToDeviceMessage(name), 'success');
      void analytics.fileSave('reduce', 'gpx', res.saved ? 'saved' : 'cancelled');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Reduce points" />

    {#if !activeFile}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No file loaded</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import a GPX or FIT file to reduce its point count.
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
        class="mx-6 mt-[14px] overflow-hidden rounded-[22px] border"
        style="border-color:#e6dff5;box-shadow:0 8px 22px {rgba(t.icon, 0.1)};"
      >
        <div class="relative h-[340px]" style="background:#ece9f4;">
          <RouteMap variant="reduce" {route} {simplified} />
          <MapBadge position="left-3 top-3" extraClass="text-[11px] font-extrabold">
            <span style="color:{t.title};">Kept route</span>
          </MapBadge>
          <MapBadge position="bottom-[10px] left-3" extraClass="flex items-center gap-[10px] text-[11px] font-bold">
            <span class="flex items-center gap-[5px]" style="color:#9a8fc0;">
              <span class="inline-block h-[3px] w-3 rounded-[2px]" style="background:#cdbfe8;"></span>original
            </span>
            <span class="flex items-center gap-[5px]" style="color:{t.title};">
              <span class="inline-block h-[3px] w-3 rounded-[2px]" style="background:{t.icon};"></span>simplified
            </span>
          </MapBadge>
        </div>
        <div class="flex gap-3 bg-white px-4 pb-4 pt-[14px]">
          <div class="flex-1 rounded-[14px] p-3" style="background:#f6f1fd;">
            <div class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">
              Points {#if calculating}<Spinner />{/if}
            </div>
            <div data-testid="points-stat" class="mt-[2px] text-[18px] font-extrabold" style="color:{t.title};">
              <span style="color:#b3a3d6;">{formatCount(points.length)}</span> → {calculating ? 'calculating…' : formatCount(reduced.length)}
            </div>
          </div>
          <div class="flex-1 rounded-[14px] p-3" style="background:#f6f1fd;">
            <div class="text-[10px] font-bold uppercase tracking-[0.08em]" style="color:{t.subtitle};">Size</div>
            <div class="mt-[2px] text-[18px] font-extrabold" style="color:{t.title};">
              <span style="color:#b3a3d6;">{formatBytes(beforeBytes)}</span> → {formatBytes(afterBytes)}
            </div>
          </div>
        </div>
      </div>

      <div class="mx-6 mt-[14px] rounded-[16px] border bg-white p-4" style="border-color:#efece6;">
        <div class="mb-3 flex justify-between">
          <div class="text-[14px] font-bold text-ink">Detail kept</div>
          <div class="text-[13px] font-extrabold" style="color:{t.button};">{detailLabel}</div>
        </div>
        <input
          type="range" min="0" max="100" step="1" bind:value={percent}
          class="w-full" style="accent-color:{t.icon};"
        />
        <div class="mt-2 flex justify-between text-[11px] font-semibold" style="color:#a89ec0;">
          <span>Smaller file</span><span>More detail</span>
        </div>
        <p class="mt-[10px] text-[11px] leading-[1.5]" style="color:#9a8fc0;">
          Drag toward "More detail" to keep the track shape; toward "Smaller file" to shrink it. See the live Points and Size above.
        </p>
      </div>
    {/if}
  </div>

  {#if activeFile}
    <div class="flex gap-3 px-6 pb-5 pt-2">
      <button
        data-testid="reduce-share"
        class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white disabled:opacity-50"
        style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.3)};"
        disabled={busy || calculating || reduced.length < 2}
        onclick={shareReduced}
      >
        {#if busy}<Spinner /> Working…{:else if calculating}<Spinner /> Calculating…{:else}Share{/if}
      </button>
      <button
        data-testid="reduce-save"
        class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] border-2 text-[16px] font-extrabold disabled:opacity-50"
        style="border-color:{t.button};color:{t.button};background:#fff;"
        disabled={busy || calculating || reduced.length < 2}
        onclick={saveReduced}
      >
        {#if busy}<Spinner /> Working…{:else if calculating}<Spinner /> Calculating…{:else}Save{/if}
      </button>
    </div>
  {/if}
</div>
