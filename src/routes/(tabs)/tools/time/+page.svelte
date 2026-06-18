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
  import { setStartTime, shiftTimeSeconds, removeStillTime } from '$lib/domain/usecases/timeTools';
  import { fileStartMs } from '$lib/domain/usecases/mergeEngine';
  import { exportName, formatDuration } from '$lib/domain/usecases/format';
  import { serializeGpx } from '$lib/data/serialization/GpxSerializer';
  import { adManager } from '$lib/ads/AdManager';

  const t = toolThemes.time;

  let busy = $state(false);
  // The datetime-local value the user has entered (empty = leave start as-is).
  let startInput = $state('');
  // Cumulative manual shift in seconds (the ± stepper).
  let shiftSeconds = $state(0);
  let removeStill = $state(false);

  $effect(() => {
    if ($loadedFiles.length > 0) void adManager.prepareInterstitial();
  });

  let activeFile = $derived(
    $loadedFiles.find((f) => f.id === $editSession.fileId) ?? $loadedFiles[0] ?? null
  );
  let points = $derived(activeFile?.points ?? []);
  let startMs = $derived(fileStartMs(points));
  let hasTime = $derived(startMs !== null);

  // Prefill the datetime-local input whenever the active file changes.
  $effect(() => {
    startInput = startMs !== null ? toLocalInput(startMs) : '';
  });

  // ms epoch → "YYYY-MM-DDTHH:mm" in LOCAL time (datetime-local format).
  function toLocalInput(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Compose: setStartTime (if changed) → shiftTimeSeconds → removeStillTime.
  let result = $derived.by(() => {
    let pts = points;
    const parsed = startInput ? Date.parse(startInput) : NaN;
    if (hasTime && Number.isFinite(parsed)) pts = setStartTime(pts, parsed);
    if (shiftSeconds !== 0) pts = shiftTimeSeconds(pts, shiftSeconds);
    if (removeStill) {
      const r = removeStillTime(pts);
      return { points: r.points, removedSeconds: r.removedSeconds };
    }
    return { points: pts, removedSeconds: 0 };
  });

  function nudge(deltaSec: number) {
    shiftSeconds += deltaSec;
  }

  function shiftLabel(sec: number): string {
    const sign = sec >= 0 ? '+' : '−';
    return `${sign}${formatDuration(Math.abs(sec))}`;
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

  async function applyAndExport() {
    if (busy || !activeFile) return;
    busy = true;
    try {
      const xml = serializeGpx(result.points, 'retimed');
      const name = exportName(activeFile.name, 'retimed');
      await fileService.exportAndShare(xml, name);
      showToast('Updated file exported', 'success');
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
      const xml = serializeGpx(result.points, 'retimed');
      const name = exportName(activeFile.name, 'retimed');
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
    <ToolHeader title="Time & speed" />

    {#if !activeFile}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No file loaded</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import a GPX or FIT file to fix its start time & pauses.
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

      {#if !hasTime}
        <div
          class="mx-6 mt-3 rounded-[16px] border p-4 text-[13px]"
          style="border-color:#fed7aa;background:{t.tile};color:{t.title};"
        >
          This track has no timestamps, so time tools don't apply. Other tools can still help.
        </div>
      {:else}
        <!-- Start time -->
        <div class="mx-6 mt-3 rounded-[18px] border bg-white p-4" style="border-color:#f1e7da;">
          <div class="text-[14px] font-bold text-ink">Start time</div>
          <p class="mb-2 mt-[2px] text-[12px]" style="color:#9aa0a6;">
            Set when the activity began (local time).
          </p>
          <input
            type="datetime-local"
            data-testid="time-start-input"
            bind:value={startInput}
            class="w-full rounded-[12px] border px-3 py-[10px] text-[14px] font-semibold text-ink"
            style="border-color:#f1e7da;background:{t.tile};"
          />
        </div>

        <!-- Shift stepper -->
        <div class="mx-6 mt-[14px] rounded-[18px] border bg-white p-4" style="border-color:#f1e7da;">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[14px] font-bold text-ink">Shift ±</div>
              <p class="mt-[2px] text-[12px]" style="color:#9aa0a6;">Nudge every timestamp.</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                data-testid="time-shift-minus"
                aria-label="Shift earlier 1 minute"
                class="flex h-9 w-9 items-center justify-center rounded-[11px] text-[16px] font-extrabold"
                style="background:{t.tile};color:{t.button};"
                onclick={() => nudge(-60)}>−</button
              >
              <span
                data-testid="time-shift-value"
                class="min-w-[64px] text-center text-[13px] font-extrabold"
                style="color:{t.title};"
                aria-live="polite">{shiftLabel(shiftSeconds)}</span
              >
              <button
                type="button"
                data-testid="time-shift-plus"
                aria-label="Shift later 1 minute"
                class="flex h-9 w-9 items-center justify-center rounded-[11px] text-[16px] font-extrabold"
                style="background:{t.tile};color:{t.button};"
                onclick={() => nudge(60)}>＋</button
              >
            </div>
          </div>
        </div>

        <!-- Remove still time -->
        <button
          type="button"
          data-testid="time-remove-still"
          class="mx-6 mt-[14px] flex w-[calc(100%-48px)] items-center justify-between rounded-[18px] border bg-white p-4 text-left"
          style="border-color:#f1e7da;"
          aria-pressed={removeStill}
          onclick={() => (removeStill = !removeStill)}
        >
          <div>
            <div class="text-[14px] font-bold text-ink">Remove still time</div>
            <div data-testid="time-removed" class="mt-[2px] text-[12px]" style="color:#9aa0a6;">
              {#if removeStill}
                Removed {formatDuration(result.removedSeconds)} of pauses
              {:else}
                Compress out stationary pauses
              {/if}
            </div>
          </div>
          <Toggle on={removeStill} accent={t.button} />
        </button>
      {/if}
    {/if}
  </div>

  {#if activeFile}
    <div class="px-6 pb-5 pt-2">
      <div class="flex gap-3">
        <button
          data-testid="time-export"
          class="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white disabled:opacity-50"
          style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.3)};"
          disabled={busy}
          onclick={applyAndExport}
        >
          {#if busy}<Spinner /> Working…{:else}Apply &amp; export{/if}
        </button>
        <button
          data-testid="time-save"
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
