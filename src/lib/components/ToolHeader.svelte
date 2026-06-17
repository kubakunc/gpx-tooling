<script lang="ts">
  interface Props {
    title: string;
  }
  let { title }: Props = $props();

  function back() {
    if (typeof history !== 'undefined' && history.length > 1) {
      history.back();
    } else {
      location.href = '/';
    }
  }
</script>

<div class="flex items-center gap-[14px] px-6 pb-[6px] pt-[14px]">
  <button
    type="button"
    onclick={back}
    aria-label="Back"
    class="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] text-[18px]"
    style="background:#f1efe9;color:#1c1917;"
  >
    ‹
  </button>
  <div class="flex-1">
    <div class="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">Tools /</div>
    <div class="text-[22px] font-extrabold tracking-[-0.02em] text-ink">{title}</div>
  </div>
</div>
