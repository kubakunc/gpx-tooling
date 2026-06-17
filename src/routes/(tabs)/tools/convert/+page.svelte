<script lang="ts">
  import ToolHeader from '$lib/components/ToolHeader.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import ActiveFileSelector from '$lib/components/ActiveFileSelector.svelte';
  import { toolThemes, rgba } from '$lib/toolThemes';
  import { loadedFiles, addFiles } from '$lib/stores/loadedFiles';
  import { editSession, setFileId, resetEditSession } from '$lib/stores/editSession';
  import { fileService } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import { EXPORT_FORMATS, type ExportFormat, serializeAs, stripSensors } from '$lib/domain/usecases/convert';
  import { exportName } from '$lib/domain/usecases/format';

  const t = toolThemes.convert;

  let busy = $state(false);
  let target = $state<ExportFormat>('tcx');
  let keepSensors = $state(true);

  let activeFile = $derived(
    $loadedFiles.find((f) => f.id === $editSession.fileId) ?? $loadedFiles[0] ?? null
  );
  let points = $derived(activeFile?.points ?? []);
  let hasSensors = $derived(points.some((p) => p.sensors.hr !== undefined || p.sensors.cadence !== undefined || p.sensors.power !== undefined));
  // KML has no schema for HR/cadence/power, so the toggle is meaningless there.
  let sensorsUnsupported = $derived(target === 'kml');
  let sensorsDisabled = $derived(!hasSensors || sensorsUnsupported);
  // Effective ON state: only when sensors exist, are wanted, and the format can store them.
  let sensorsOn = $derived(hasSensors && keepSensors && !sensorsUnsupported);
  // Source extension shown in the "From" card (uppercase, defaults to GPX).
  let sourceExt = $derived((activeFile?.name.match(/\.(\w+)$/)?.[1] ?? 'gpx').toUpperCase());
  let exportFilename = $derived(activeFile ? exportName(activeFile.name, '', target) : '');

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

  async function convertAndSave() {
    if (busy || !activeFile || points.length === 0) return;
    busy = true;
    try {
      const out = sensorsOn ? points : stripSensors(points);
      const name = exportFilename;
      const data = serializeAs(target, out, name);
      await fileService.exportAndShare(data, name);
      showToast(`Converted to ${target.toUpperCase()}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Conversion failed', 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto">
    <ToolHeader title="Convert format" />

    {#if !activeFile}
      <div class="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div class="text-[15px] font-bold text-ink">No file loaded</div>
        <p class="mt-2 max-w-[260px] text-[13px] leading-[1.5]" style="color:#8a9099;">
          Import a GPX or FIT file to convert it to another format.
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

      <div class="mx-6 mt-3 flex items-center gap-3">
        <div
          class="flex-1 rounded-[18px] border bg-white p-4 text-center"
          style="border-color:#f3dceb;"
        >
          <div class="text-[10px] font-bold uppercase tracking-[0.1em]" style="color:#b06a8c;">From</div>
          <div class="mt-[2px] text-[24px] font-extrabold tracking-[0.02em]" style="color:{t.title};">{sourceExt}</div>
        </div>
        <div class="text-[24px] font-extrabold" style="color:{t.icon};">→</div>
        <div
          class="flex-1 rounded-[18px] p-4 text-center"
          style="background:{t.icon};box-shadow:0 10px 22px {rgba(t.icon, 0.3)};"
        >
          <div class="text-[10px] font-bold uppercase tracking-[0.1em]" style="color:#ffd6e8;">To</div>
          <div class="mt-[2px] text-[24px] font-extrabold tracking-[0.02em] text-white">{target.toUpperCase()}</div>
        </div>
      </div>

      <div class="px-6 pt-[18px] text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
        Target format
      </div>
      <div class="flex gap-[10px] px-6 pt-[10px]">
        {#each EXPORT_FORMATS as fmt (fmt)}
          <button
            type="button"
            class="flex-1 rounded-[14px] text-center text-[14px] font-extrabold"
            style="padding-top:12px;padding-bottom:12px;{target === fmt
              ? `background:${t.tile};border:2px solid ${t.icon};color:${t.button};`
              : 'border:1px solid #efece6;background:#fff;color:#6b7077;'}"
            onclick={() => (target = fmt)}
          >
            {fmt.toUpperCase()}
          </button>
        {/each}
        <div
          class="flex-1 rounded-[14px] border bg-[#f7f4f0] text-center text-[14px] font-extrabold text-[#b9bcc2]"
          style="padding-top:13px;padding-bottom:13px;border-color:#efece6;"
          aria-disabled="true"
          title="FIT is import-only"
        >
          FIT
        </div>
      </div>
      <div class="px-6 pt-[6px] text-[11px]" style="color:#b9bcc2;">
        FIT is import-only — pick GPX, TCX, or KML.
      </div>

      <div class="px-6 pt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
        Keep data
      </div>
      <div class="flex flex-col gap-[10px] px-6 pb-4 pt-[10px]">
        <button
          type="button"
          class="flex items-center gap-3 rounded-[16px] border bg-white px-[15px] py-[13px] text-left"
          style="border-color:#efece6;{sensorsDisabled ? 'opacity:0.5;' : ''}"
          disabled={sensorsDisabled}
          onclick={() => (keepSensors = !keepSensors)}
        >
          <div class="flex-1 text-[14px] font-bold text-ink">
            Sensor data <span class="font-semibold" style="color:#9aa0a8;">HR · CAD · PWR</span>
          </div>
          <Toggle on={sensorsOn} accent={t.icon} />
        </button>
        {#if sensorsUnsupported}
          <div class="px-1 text-[11px]" style="color:#b9bcc2;">KML can't store sensor data.</div>
        {:else if !hasSensors}
          <div class="px-1 text-[11px]" style="color:#b9bcc2;">This track has no sensor data.</div>
        {/if}
      </div>
    {/if}
  </div>

  {#if activeFile}
    <div class="px-6 pb-3 pt-2">
      <div class="mb-[8px] text-center text-[12px]" style="color:#b06a8c;">
        Saves as: <span class="font-bold">{exportFilename}</span>
      </div>
      <button
        type="button"
        class="flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] text-[16px] font-extrabold text-white"
        style="background:{t.button};box-shadow:0 12px 26px {rgba(t.button, 0.32)};"
        disabled={busy || points.length === 0}
        onclick={convertAndSave}
      >
        {#if busy}<Spinner /> Working…{:else}Convert format{/if}
      </button>
    </div>
  {/if}
</div>
