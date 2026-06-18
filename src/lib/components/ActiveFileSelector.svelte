<script lang="ts">
  import type { LoadedFile } from '$lib/stores/loadedFiles';
  import { addFiles } from '$lib/stores/loadedFiles';
  import { setFileId, resetEditSession } from '$lib/stores/editSession';
  import { fileService } from '$lib/data/io/FileService';
  import { showToast } from '$lib/stores/toast';

  interface Props {
    files: LoadedFile[];
    active: LoadedFile;
    /** Tile/chip background. */
    tile: string;
    /** Accent bar + selected check color. */
    accent: string;
    /** File-name text color. */
    title: string;
  }
  let { files, active, tile, accent, title }: Props = $props();

  let open = $state(false);
  let busy = $state(false);

  function choose(id: string) {
    open = false;
    if (id === active.id) return;
    // Routing through the editSession setters keeps start<end invariants;
    // reset bounds so the new track is shown in full.
    resetEditSession();
    setFileId(id);
  }

  async function importFile() {
    if (busy) return;
    busy = true;
    try {
      const imported = await fileService.pickAndImportGpx();
      if (imported.length > 0) {
        const added = addFiles(imported);
        open = false;
        resetEditSession();
        if (added[0]) setFileId(added[0].id);
        showToast(`Imported ${imported.length} file${imported.length === 1 ? '' : 's'}`, 'success');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="relative mx-6 mt-[6px]">
  <!-- The whole chip is a button: tap to switch the source file or import a new one. -->
  <button
    type="button"
    data-testid="active-file-selector"
    class="inline-flex max-w-full items-center gap-[9px] rounded-[12px] px-[14px] py-[9px]"
    style="background:{tile};"
    onclick={() => (open = !open)}
    aria-haspopup="listbox"
    aria-expanded={open}
  >
    <div class="h-7 w-2 shrink-0 rounded-[4px]" style="background:{accent};"></div>
    <div class="min-w-0 text-left">
      <div class="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Source · tap to change</div>
      <div class="truncate text-[14px] font-bold" style="color:{title};">{active.name}</div>
    </div>
    <span class="ml-[2px] shrink-0 text-[11px] font-extrabold" style="color:{accent};">▾</span>
  </button>

  {#if open}
    <ul
      class="absolute left-0 z-10 mt-[6px] w-[280px] max-w-[calc(100vw-48px)] overflow-hidden rounded-[14px] border bg-white py-1"
      style="border-color:#eef0ec;box-shadow:0 12px 30px rgba(0,0,0,0.12);"
      role="listbox"
    >
      {#each files as f (f.id)}
        <li role="option" aria-selected={f.id === active.id}>
          <button
            type="button"
            class="flex w-full items-center gap-2 px-[14px] py-[10px] text-left text-[14px] font-bold text-ink"
            onclick={() => choose(f.id)}
          >
            <span class="w-[14px] shrink-0" style="color:{accent};">
              {f.id === active.id ? '✓' : ''}
            </span>
            <span class="truncate">{f.name}</span>
          </button>
        </li>
      {/each}
      <li class="mt-1 border-t" style="border-color:#f1f3ef;">
        <button
          type="button"
          data-testid="active-file-import"
          class="flex w-full items-center gap-2 px-[14px] py-[11px] text-left text-[14px] font-extrabold"
          style="color:{accent};"
          disabled={busy}
          onclick={importFile}
        >
          <span class="w-[14px] shrink-0 text-center">＋</span>
          <span>{busy ? 'Importing…' : 'Import a file'}</span>
        </button>
      </li>
    </ul>
  {/if}
</div>
