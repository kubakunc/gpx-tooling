<script lang="ts">
  import { toasts, dismissToast, type ToastKind } from '$lib/stores/toast';

  const colors: Record<ToastKind, { bg: string; text: string }> = {
    success: { bg: '#10b981', text: '#ffffff' },
    error: { bg: '#f43f5e', text: '#ffffff' },
    info: { bg: '#475569', text: '#ffffff' }
  };
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-[84px] z-[1000] flex flex-col items-center gap-2 px-6">
  {#each $toasts as toast (toast.id)}
    {@const c = colors[toast.kind]}
    <button
      type="button"
      class="pointer-events-auto w-full max-w-[420px] rounded-[14px] px-4 py-3 text-left text-[14px] font-bold"
      style="background:{c.bg};color:{c.text};box-shadow:0 8px 22px rgba(0,0,0,.22);"
      onclick={() => dismissToast(toast.id)}
    >
      {toast.message}
    </button>
  {/each}
</div>
