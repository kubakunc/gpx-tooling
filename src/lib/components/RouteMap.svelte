<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Map as LeafletMap } from 'leaflet';

  interface Props {
    variant: 'merge' | 'trim' | 'reduce';
  }
  let { variant }: Props = $props();

  let el: HTMLDivElement;
  let map: LeafletMap | null = null;

  // Exact route coords ported from the design's support.js.
  const route: [number, number][] = [
    [49.292, 19.94],
    [49.295, 19.946],
    [49.299, 19.949],
    [49.301, 19.956],
    [49.305, 19.96],
    [49.308, 19.967],
    [49.31, 19.972],
    [49.314, 19.978],
    [49.317, 19.983],
    [49.32, 19.99],
    [49.323, 19.996],
    [49.327, 20.001],
    [49.33, 20.008],
    [49.332, 20.015],
    [49.336, 20.02],
    [49.339, 20.027]
  ];

  onMount(async () => {
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    if (map || !el) return;

    const opts = {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      tap: false,
      attributionControl: true
    };

    map = L.map(el, opts);
    map.attributionControl.setPrefix(false);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const dot = (
      p: [number, number],
      fill: string,
      stroke = '#fff',
      r = 6
    ) =>
      L.circleMarker(p, {
        radius: r,
        fillColor: fill,
        color: stroke,
        weight: 2.5,
        fillOpacity: 1
      }).addTo(map!);

    if (variant === 'merge') {
      // Merged route, 3 segments (3 files)
      L.polyline(route, { color: '#ffffff', weight: 8, opacity: 0.9 }).addTo(map);
      L.polyline(route.slice(0, 7), { color: '#34d399', weight: 5 }).addTo(map);
      L.polyline(route.slice(6, 12), { color: '#10b981', weight: 5 }).addTo(map);
      L.polyline(route.slice(11), { color: '#059669', weight: 5 }).addTo(map);
      dot(route[0], '#059669');
      dot(route[route.length - 1], '#059669');
    } else if (variant === 'trim') {
      // Full faded track + kept segment + handles
      L.polyline(route, { color: '#5a7196', weight: 4, opacity: 0.5, dashArray: '2 8' }).addTo(map);
      const kept = route.slice(4, 12);
      L.polyline(kept, { color: '#ffffff', weight: 8, opacity: 0.9 }).addTo(map);
      L.polyline(kept, { color: '#1d4ed8', weight: 5 }).addTo(map);
      dot(route[0], '#cbd5e6', '#fff', 5);
      dot(route[route.length - 1], '#cbd5e6', '#fff', 5);
      dot(route[4], '#ffffff', '#1d4ed8', 7);
      dot(route[11], '#1d4ed8', '#fff', 7);
    } else {
      // Reduce: original (dense) vs simplified (fewer vertices)
      L.polyline(route, { color: '#9a8fc0', weight: 5, opacity: 0.6 }).addTo(map);
      const simp = [route[0], route[3], route[6], route[9], route[12], route[15]];
      L.polyline(simp, { color: '#7c3aed', weight: 3 }).addTo(map);
      simp.forEach((p) => dot(p, '#6d28d9', '#fff', 4));
    }

    setTimeout(() => {
      if (!map) return;
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(route), { padding: [22, 22] });
    }, 280);
  });

  onDestroy(() => {
    map?.remove();
    map = null;
  });
</script>

<div bind:this={el} class="absolute inset-0"></div>
