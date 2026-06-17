<script lang="ts">
  import { onMount } from 'svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import AdBanner from '$lib/components/AdBanner.svelte';
  import Snackbar from '$lib/components/Snackbar.svelte';
  import { adManager } from '$lib/ads/AdManager';
  let { children } = $props();

  onMount(() => {
    // Resolve UMP consent, initialise AdMob, and show the banner (native only).
    void adManager.init();
  });
</script>

<div class="flex h-full flex-col bg-screen">
  <main class="flex-1 overflow-y-auto">
    {@render children()}
  </main>
  <Snackbar />
  <BottomNav />
  <AdBanner />
</div>
