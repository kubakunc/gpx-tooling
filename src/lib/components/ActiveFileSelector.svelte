<script lang="ts">
  import type { LoadedFile } from '$lib/stores/loadedFiles';
  import { setFileId, resetEditSession } from '$lib/stores/editSession';

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

  function choose(id: string) {
    open = false;
    if (id === active.id) return;
    // Routing through the editSession setters keeps start<end invariants;
    // reset bounds so the new track is shown in full.
    resetEditSession();
    setFileId(id);
  }
</script>

<div class="relative mx-6 mt-[6px]">
  <button
    type="button"
    class="inline-flex max-w-full items-center gap-[9px] rounded-[12px] px-[14px] py-[9px]"
    style="background:{tile};"
    onclick={() => (files.length > 1 ? (open = !open) : null)}
    aria-haspopup={files.length > 1 ? 'listbox' : undefined}
    aria-expanded={files.length > 1 ? open : undefined}
  >
    <div class="h-5 w-2 shrink-0 rounded-[4px]" style="background:{accent};"></div>
    <div class="truncate text-[14px] font-bold" style="color:{title};">{active.name}</div>
    {#if files.length > 1}
      <span class="shrink-0 text-[12px]" style="color:{title};">▾</span>
    {/if}
  </button>

  {#if open && files.length > 1}
    <ul
      class="absolute left-0 z-10 mt-[6px] w-[260px] max-w-[calc(100vw-48px)] overflow-hidden rounded-[14px] border bg-white py-1"
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
    </ul>
  {/if}
</div>
