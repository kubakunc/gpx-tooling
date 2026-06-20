<script lang="ts">
  import { adManager } from '$lib/ads/AdManager';
  import { settings, setUnits, type Units } from '$lib/stores/settings';
  import { analytics } from '$lib/analytics/analytics';
  import { onMount } from 'svelte';

  onMount(() => {
    void analytics.toolOpen('settings');
  });

  const unitOptions: { value: Units; label: string }[] = [
    { value: 'metric', label: 'Metric (km/h, km, m)' },
    { value: 'imperial', label: 'Imperial (mph, mi, ft)' }
  ];

  function changeUnits(value: Units) {
    setUnits(value);
    void analytics.toolAction('settings', 'units', { units: value });
  }

  function manageConsent() {
    void adManager.reopenConsentForm();
  }
</script>

<div class="px-6 pb-2 pt-[18px]">
  <div class="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">GPX Editor</div>
  <h1 class="text-[27px] font-extrabold tracking-[-0.02em] text-ink">Settings</h1>
</div>

<div class="flex flex-col gap-[12px] px-6 pt-[10px]">
  <div class="rounded-[18px] border p-[18px]" style="background:#fff;border-color:#efece6;">
    <div class="text-[15px] font-extrabold text-ink">Unit Preference</div>
    <p class="mt-[6px] text-[13px] leading-[1.55] text-ink-muted">
      Choose how distances, elevation and speed are displayed across every tool.
    </p>
    <div class="mt-[14px] flex flex-col gap-[10px]">
      {#each unitOptions as opt (opt.value)}
        {@const active = $settings.units === opt.value}
        <label
          class="flex cursor-pointer items-center gap-[12px] rounded-[14px] border p-[13px]"
          style="background:{active ? '#f5f3ee' : '#fff'};border-color:{active ? '#3b3a36' : '#efece6'};"
        >
          <input
            type="radio"
            name="units"
            value={opt.value}
            checked={active}
            data-testid="units-{opt.value}"
            class="h-[18px] w-[18px]"
            style="accent-color:#3b3a36;"
            onchange={() => changeUnits(opt.value)}
          />
          <span class="text-[14px] font-extrabold text-ink">{opt.label}</span>
        </label>
      {/each}
    </div>
  </div>

  <div class="rounded-[18px] border p-[18px]" style="background:#fff;border-color:#efece6;">
    <div class="text-[15px] font-extrabold text-ink">Privacy &amp; ads</div>
    <p class="mt-[6px] text-[13px] leading-[1.55] text-ink-muted">
      GPX Editor is free and supported by ads. You can review or change your data
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
