<script lang="ts">
  interface Props {
    on: boolean;
    accent: string;
  }
  let { on, accent }: Props = $props();
</script>

<!-- Presentational switch (no toggle logic this phase). -->
<div
  class="relative h-[26px] w-[44px] rounded-[13px]"
  style="background:{on ? accent : '#e7e2dc'};"
  role="switch"
  aria-checked={on}
>
  <div
    class="absolute top-[3px] h-5 w-5 rounded-full bg-white"
    style="{on ? 'right:3px;' : 'left:3px;'}"
  ></div>
</div>
