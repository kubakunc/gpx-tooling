<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Map as LeafletMap, LayerGroup } from 'leaflet';

  export interface LatLon {
    lat: number;
    lon: number;
  }

  interface Props {
    variant: 'merge' | 'trim' | 'reduce';
    /** Real route coords. When provided, drawn instead of the demo route. */
    route?: LatLon[];
    /** Trim: [startRatio, endRatio] of `route` to highlight as kept. */
    keptRange?: [number, number];
    /** Reduce: the simplified subset to overlay. */
    simplified?: LatLon[];
  }
  let { variant, route, keptRange, simplified }: Props = $props();

  let el: HTMLDivElement;
  let map: LeafletMap | null = null;
  // Single layer group holding every route polyline/dot; cleared on each redraw
  // so layers never accumulate across reactive prop changes.
  let overlay: LayerGroup | null = null;
  // Cached Leaflet module so redraw() can run synchronously after onMount.
  let L: typeof import('leaflet') | null = null;

  // Exact demo route ported from the design's support.js — fallback when no
  // real route is supplied so unwired states still look right.
  const demoRoute: [number, number][] = [
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

  const toLatLng = (p: LatLon): [number, number] => [p.lat, p.lon];

  /**
   * Rebuild every overlay layer from the current props and refit the bounds.
   * Reads `route`/`keptRange`/`simplified`/`variant` so the $effect tracks them.
   */
  function redraw(): void {
    if (!map || !overlay || !L) return;
    const Lib = L;
    const group = overlay;
    group.clearLayers();

    const dot = (p: [number, number], fill: string, stroke = '#fff', r = 6) =>
      Lib.circleMarker(p, {
        radius: r,
        fillColor: fill,
        color: stroke,
        weight: 2.5,
        fillOpacity: 1
      }).addTo(group);

    const hasReal = !!route && route.length >= 2;
    const coords: [number, number][] = hasReal ? route!.map(toLatLng) : demoRoute;

    if (variant === 'merge') {
      // Single emerald route over a white casing.
      Lib.polyline(coords, { color: '#ffffff', weight: 8, opacity: 0.9 }).addTo(group);
      Lib.polyline(coords, { color: '#10b981', weight: 5 }).addTo(group);
      dot(coords[0], '#059669');
      dot(coords[coords.length - 1], '#059669');
    } else if (variant === 'trim') {
      // Faded full track + highlighted kept segment.
      Lib.polyline(coords, { color: '#5a7196', weight: 4, opacity: 0.5, dashArray: '2 8' }).addTo(group);
      const n = coords.length;
      const [s, e] = keptRange ?? [0.25, 0.75];
      const from = Math.max(0, Math.min(n - 1, Math.round(s * n)));
      const to = Math.max(from + 1, Math.min(n, Math.round(e * n)));
      const kept = coords.slice(from, to);
      if (kept.length >= 2) {
        Lib.polyline(kept, { color: '#ffffff', weight: 8, opacity: 0.9 }).addTo(group);
        Lib.polyline(kept, { color: '#1d4ed8', weight: 5 }).addTo(group);
        dot(kept[0], '#ffffff', '#1d4ed8', 7);
        dot(kept[kept.length - 1], '#1d4ed8', '#fff', 7);
      }
      dot(coords[0], '#cbd5e6', '#fff', 5);
      dot(coords[n - 1], '#cbd5e6', '#fff', 5);
    } else {
      // Reduce: original (faded) vs simplified overlay.
      Lib.polyline(coords, { color: '#9a8fc0', weight: 5, opacity: 0.6 }).addTo(group);
      const simp: [number, number][] =
        simplified && simplified.length >= 2
          ? simplified.map(toLatLng)
          : hasReal
            ? [coords[0], coords[coords.length - 1]]
            : [
                demoRoute[0],
                demoRoute[3],
                demoRoute[6],
                demoRoute[9],
                demoRoute[12],
                demoRoute[15]
              ];
      Lib.polyline(simp, { color: '#7c3aed', weight: 3 }).addTo(group);
      simp.forEach((p) => dot(p, '#6d28d9', '#fff', 4));
    }

    // Defer measuring until the container's entry layout settles.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!map) return;
        map.invalidateSize();
        map.fitBounds(Lib.latLngBounds(coords), { padding: [22, 22] });
      });
    });
  }

  onMount(async () => {
    L = (await import('leaflet')).default as unknown as typeof import('leaflet');
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
      attributionControl: true
    };

    map = L.map(el, opts);
    map.attributionControl.setPrefix(false);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    overlay = L.layerGroup().addTo(map);

    // Initial draw once the map exists; the $effect handles later prop changes.
    redraw();
  });

  // Re-run redraw() whenever the relevant props change so the map updates live
  // (slider drags in Trim/Reduce, reorder in Merge). Guarded until the map is
  // initialized; clearLayers() in redraw() prevents any layer accumulation.
  $effect(() => {
    // Touch the reactive props so this effect tracks them.
    void route;
    void keptRange;
    void simplified;
    void variant;
    if (map && overlay && L) redraw();
  });

  onDestroy(() => {
    map?.remove();
    map = null;
    overlay = null;
    L = null;
  });
</script>

<div bind:this={el} class="absolute inset-0"></div>
