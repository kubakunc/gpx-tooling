// Generates two realistic demo rides (no personal data) for store screenshots:
//   demo-a.gpx (first half) + demo-b.gpx (second half), contiguous in time & space,
//   so Merge stitches them into one clean ~24 km route. Both carry hr/cad/power.
//   node store-assets/fixtures/gen.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const dir = dirname(fileURLToPath(import.meta.url));

const N = 360;                       // points
const STEP_S = 12;                   // seconds between points  → ~72 min total
const T0 = Date.parse('2026-06-14T07:30:00Z');
const CLAT = 49.305, CLON = 19.96;   // Tatra foothills (roads/trails render nicely on OSM)
const R = 0.026;                     // loop radius (deg) → ~22-24 km perimeter

function pt(i) {
  const u = i / N;
  const ang = u * 2 * Math.PI;
  // loop with gentle wiggle so it follows terrain rather than a perfect circle
  const lat = CLAT + R * Math.sin(ang) + 0.004 * Math.sin(ang * 5);
  const lon = CLON + R * 1.5 * Math.cos(ang) + 0.006 * Math.cos(ang * 4);
  const ele = 720 + 180 * Math.sin(ang - 0.6) + 40 * Math.sin(ang * 3); // climb + rollers
  const t = new Date(T0 + i * STEP_S * 1000);
  const hr = Math.round(132 + 26 * Math.sin(ang - 0.4));
  const cad = Math.round(86 + 6 * Math.sin(ang * 2));
  const pw = Math.round(225 + 70 * Math.sin(ang - 0.5));
  return { lat, lon, ele, t, hr, cad, pw };
}

function trkpt(p, powerBias = 0) {
  return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">
        <ele>${p.ele.toFixed(1)}</ele>
        <time>${p.t.toISOString()}</time>
        <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${p.hr}</gpxtpx:hr><gpxtpx:cad>${p.cad}</gpxtpx:cad></gpxtpx:TrackPointExtension><power>${p.pw + powerBias}</power></extensions>
      </trkpt>`;
}

function gpx(name, pts, powerBias = 0) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VeloLogic Labs" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk><name>${name}</name><trkseg>
${pts.map((p) => trkpt(p, powerBias)).join('\n')}
  </trkseg></trk>
</gpx>
`;
}

const all = Array.from({ length: N }, (_, i) => pt(i));
const mid = Math.floor(N / 2);
// Contiguous halves (share the midpoint) → clean single-segment merge.
writeFileSync(join(dir, 'demo-a.gpx'), gpx('Morning loop — part 1', all.slice(0, mid + 1)));
writeFileSync(join(dir, 'demo-b.gpx'), gpx('Morning loop — part 2', all.slice(mid), 12));
console.log('wrote demo-a.gpx + demo-b.gpx');
