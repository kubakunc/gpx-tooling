<script lang="ts">
  import BottomNav from '$lib/components/BottomNav.svelte';
  import AdBanner from '$lib/components/AdBanner.svelte';
  let { children } = $props();
</script>

<div class="flex h-full flex-col bg-screen">
  <main class="flex-1 overflow-y-auto">
    {@render children()}
  </main>
  <BottomNav />
  <AdBanner />
</div>
