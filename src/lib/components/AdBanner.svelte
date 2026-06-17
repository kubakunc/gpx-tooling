<script lang="ts">
  import { Capacitor } from '@capacitor/core';

  // Reserve a 50px strip so content never sits under the banner.
  // Native: the AdMob banner overlays this area, so render it transparent/empty.
  // Web/preview: show the existing placeholder text.
  const isNative = Capacitor.isNativePlatform();
</script>

{#if isNative}
  <div class="h-[50px] border-t border-line" aria-hidden="true"></div>
{:else}
  <div
    class="flex h-[50px] items-center justify-center border-t border-line bg-ad text-[11px] tracking-[0.1em]"
    style="color:#b3aea4;"
  >
    AD · Adaptive Banner
  </div>
{/if}
