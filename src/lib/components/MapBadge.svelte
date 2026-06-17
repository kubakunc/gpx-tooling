<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Positioning utility classes, e.g. "left-3 top-3" or "bottom-[10px] left-3". */
    position: string;
    /** Extra layout classes for the pill (gap, flex, font sizing, etc.). */
    extraClass?: string;
    children: Snippet;
  }
  let { position, extraClass = '', children }: Props = $props();
</script>

<div
  class="pointer-events-none absolute z-[500] rounded-[10px] px-[11px] py-[6px] {position} {extraClass}"
  style="background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.14);"
>
  {@render children()}
</div>
