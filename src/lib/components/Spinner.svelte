<script lang="ts">
  interface Props {
    /** Diameter in px. */
    size?: number;
    /** Stroke color. */
    color?: string;
  }
  let { size = 18, color = 'currentColor' }: Props = $props();
</script>

<svg
  class="animate-spin"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  aria-hidden="true"
>
  <circle cx="12" cy="12" r="9" stroke={color} stroke-width="3" stroke-opacity="0.25" />
  <path d="M21 12a9 9 0 0 0-9-9" stroke={color} stroke-width="3" stroke-linecap="round" />
</svg>
