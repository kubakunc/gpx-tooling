<script lang="ts">
  import { onMount } from 'svelte';
  import { Capacitor } from '@capacitor/core';
  import { App } from '@capacitor/app';
  import type { PluginListenerHandle } from '@capacitor/core';
  import TopMenu from '$lib/components/TopMenu.svelte';
  import AdBanner from '$lib/components/AdBanner.svelte';
  import Snackbar from '$lib/components/Snackbar.svelte';
  import { adManager } from '$lib/ads/AdManager';
  let { children } = $props();

  onMount(() => {
    // Resolve UMP consent, initialise AdMob, and show the banner (native only).
    void adManager.init();

    // Wire the Android hardware/edge-swipe Back to the in-app SPA history, so a
    // back gesture on a tool screen returns to the hub instead of exiting the
    // app. Only exit when there's nowhere left to go back to (the hub).
    let handle: PluginListenerHandle | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack && window.history.length > 1) window.history.back();
        else void App.exitApp();
      }).then((h) => (handle = h));
    }
    return () => void handle?.remove();
  });
</script>

<div class="flex h-full flex-col bg-screen">
  <TopMenu />
  <main class="flex-1 overflow-y-auto">
    {@render children()}
  </main>
  <Snackbar />
  <AdBanner />
</div>
