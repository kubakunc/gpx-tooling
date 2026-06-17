<script lang="ts">
  interface Props {
    percent: number;
    accent: string;
    trackBg?: string;
    /** rgba shadow color for the knob */
    knobShadow?: string;
  }
  let { percent, accent, trackBg = '#f1ead9', knobShadow }: Props = $props();
  const shadow = $derived(knobShadow ?? accent);
</script>

<!-- Presentational slider (no drag logic this phase). -->
<div class="relative h-[6px] rounded-[3px]" style="background:{trackBg};">
  <div
    class="absolute left-0 top-0 bottom-0 rounded-[3px]"
    style="width:{percent}%;background:{accent};"
  ></div>
  <div
    class="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
    style="left:{percent}%;background:{accent};box-shadow:0 2px 6px {shadow}80;"
  ></div>
</div>
