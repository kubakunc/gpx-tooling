<script lang="ts">
  import { Capacitor } from '@capacitor/core';
  import { bannerHeight } from '$lib/ads/AdManager';

  // Reserve a strip so content never sits under the banner.
  // Native: the AdMob adaptive banner height is device-computed (not a fixed
  // 50px), so reserve max(measured, fallback) and clear the home indicator via
  // the bottom safe-area inset. The native banner overlays this strip.
  // Web/preview: keep the existing fixed-height placeholder.
  const isNative = Capacitor.isNativePlatform();

  // Fallback until the native SizeChanged event reports the real height.
  const FALLBACK_HEIGHT = 50;
  let reserved = $derived(Math.max($bannerHeight, FALLBACK_HEIGHT));
</script>

{#if isNative}
  <div
    class="border-t border-line"
    style="height:{reserved}px;padding-bottom:env(safe-area-inset-bottom);"
    aria-hidden="true"
  ></div>
{:else}
  <div
    class="flex h-[50px] items-center justify-center border-t border-line bg-ad text-[11px] tracking-[0.1em]"
    style="color:#b3aea4;"
  >
    AD · Adaptive Banner
  </div>
{/if}
