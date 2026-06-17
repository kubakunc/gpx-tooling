<script lang="ts">
  interface Props {
    options: string[];
    selectedIndex: number;
    /** Pill corner radius in px (e.g. 14, 13, 12). */
    radius: number;
    /** Selected pill background. */
    selectedBg: string;
    /** Selected pill text color. */
    selectedText: string;
    /** Selected pill border color. When omitted the selected pill has no border (solid fill). */
    selectedBorder?: string;
    /** Vertical padding (px) for the selected pill. */
    selectedPadY: number;
    /** Vertical padding (px) for unselected pills. */
    unselectedPadY: number;
    /** Text size in px. */
    textSize: number;
  }
  let {
    options,
    selectedIndex,
    radius,
    selectedBg,
    selectedText,
    selectedBorder,
    selectedPadY,
    unselectedPadY,
    textSize
  }: Props = $props();
</script>

{#each options as opt, i (opt)}
  {#if i === selectedIndex}
    <div
      class="flex-1 text-center font-extrabold"
      style="border-radius:{radius}px;padding-top:{selectedPadY}px;padding-bottom:{selectedPadY}px;font-size:{textSize}px;background:{selectedBg};color:{selectedText};{selectedBorder
        ? `border:2px solid ${selectedBorder};`
        : ''}"
    >
      {opt}
    </div>
  {:else}
    <div
      class="flex-1 border bg-white text-center font-bold"
      style="border-radius:{radius}px;padding-top:{unselectedPadY}px;padding-bottom:{unselectedPadY}px;font-size:{textSize}px;border-color:#efece6;color:#6b7077;"
    >
      {opt}
    </div>
  {/if}
{/each}
