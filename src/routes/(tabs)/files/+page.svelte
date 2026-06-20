<script lang="ts">
  import Spinner from '$lib/components/Spinner.svelte';
  import type { LoadedFile } from '$lib/stores/loadedFiles';
  import { loadedFiles, addFiles, removeFile } from '$lib/stores/loadedFiles';
  import { setFileId } from '$lib/stores/editSession';
  import { fileService } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';
  import { totalDistanceMeters, elevationGainMeters, durationSeconds } from '$lib/domain/usecases/stats';
  import { formatDistance, formatGain, formatDuration } from '$lib/domain/usecases/format';
  import { settings } from '$lib/stores/settings';

  let busy = $state(false);

  function fileMeta(f: LoadedFile): string {
    return `${formatDistance(totalDistanceMeters(f.points), $settings.units)} · ${formatGain(elevationGainMeters(f.points), $settings.units)} · ${formatDuration(durationSeconds(f.points))}`;
  }

  async function importFiles() {
    if (busy) return;
    busy = true;
    try {
      const files = await fileService.pickAndImportGpx();
      if (files.length === 0) return;
      const added = addFiles(files);
      if (added.length > 0) setFileId(added[0].id);
      showToast(`Imported ${files.length} file${files.length === 1 ? '' : 's'}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      busy = false;
    }
  }

  function removeWithToast(f: LoadedFile) {
    removeFile(f.id);
    showToast(`Removed ${f.name}`, 'info');
  }
</script>

<div class="flex h-full flex-col">
  <div class="px-6 pb-2 pt-[18px]">
    <div class="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">GPX Editor</div>
    <h1 class="text-[27px] font-extrabold tracking-[-0.02em] text-ink">Files</h1>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if $loadedFiles.length === 0}
      <div class="px-6 pt-[10px]">
        <div class="rounded-[18px] border p-[18px]" style="background:#fff;border-color:#efece6;">
          <div class="text-[15px] font-extrabold text-ink">No files yet</div>
          <p class="mt-[6px] text-[13px] leading-[1.55] text-ink-muted">
            Import GPX or FIT tracks to keep them here, ready for any tool.
          </p>
        </div>
      </div>
    {:else}
      <div class="px-6 pt-[6px] text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
        {$loadedFiles.length} file{$loadedFiles.length === 1 ? '' : 's'}
      </div>
      <div class="flex flex-col gap-[10px] px-6 pb-4 pt-[10px]">
        {#each $loadedFiles as f (f.id)}
          <div
            data-testid="file-row"
            class="flex items-center gap-[13px] rounded-[18px] border bg-white p-[13px]"
            style="border-color:#eef0ec;box-shadow:0 5px 14px rgba(0,0,0,0.04);"
          >
            <div class="min-w-0 flex-1">
              <div class="truncate text-[15px] font-bold text-ink">{f.name}</div>
              <div class="text-[12px]" style="color:#8a9099;">{fileMeta(f)}</div>
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
        {/each}
      </div>
    {/if}
  </div>

  <div class="px-6 pb-3 pt-2">
    <button
      type="button"
      data-testid="import-button"
      class="flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-ink text-[16px] font-extrabold text-white"
      disabled={busy}
      onclick={importFiles}
    >
      {#if busy}<Spinner /> Working…{:else}Import GPX or FIT files{/if}
    </button>
  </div>
</div>
