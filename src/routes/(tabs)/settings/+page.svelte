<script lang="ts">
  import { adManager } from '$lib/ads/AdManager';

  function manageConsent() {
    void adManager.reopenConsentForm();
  }
</script>

<div class="px-6 pb-2 pt-[18px]">
  <div class="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">GPX Suite</div>
  <div class="text-[27px] font-extrabold tracking-[-0.02em] text-ink">Settings</div>
</div>

<div class="flex flex-col gap-[12px] px-6 pt-[10px]">
  <div class="rounded-[18px] border p-[18px]" style="background:#fff;border-color:#efece6;">
    <div class="text-[15px] font-extrabold text-ink">Coming soon</div>
    <p class="mt-[6px] text-[13px] leading-[1.55] text-ink-muted">
      App preferences and calibration options arrive in a later phase.
    </p>
  </div>
  <div class="rounded-[18px] border p-[18px]" style="background:#fff;border-color:#efece6;">
    <div class="text-[15px] font-extrabold text-ink">Privacy &amp; ads</div>
    <p class="mt-[6px] text-[13px] leading-[1.55] text-ink-muted">
      GPX Suite is free and supported by ads. You can review or change your data
      consent choices at any time.
    </p>
    <button
      type="button"
      class="mt-[14px] flex h-[44px] w-full items-center justify-center rounded-[14px] text-[14px] font-extrabold text-white"
      style="background:#3b3a36;"
      onclick={manageConsent}
    >
      Manage consent
    </button>
  </div>
</div>
