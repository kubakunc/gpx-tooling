import type { TrackPoint } from '../../domain/entities/TrackPoint';
import { formatCoord, formatNum } from './format';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trkptXml(p: TrackPoint): string {
  const parts: string[] = [
    `    <trkpt lat="${formatCoord(p.latitude)}" lon="${formatCoord(p.longitude)}">`,
  ];
  if (p.elevation !== null) parts.push(`      <ele>${formatNum(p.elevation)}</ele>`);
  if (p.time !== null) parts.push(`      <time>${p.time.toISOString()}</time>`);
  const { hr, cadence, power } = p.sensors;
  if (hr !== undefined || cadence !== undefined || power !== undefined) {
    parts.push('      <extensions>');
    parts.push('        <gpxtpx:TrackPointExtension>');
    if (hr !== undefined) parts.push(`          <gpxtpx:hr>${hr}</gpxtpx:hr>`);
    if (cadence !== undefined) parts.push(`          <gpxtpx:cad>${cadence}</gpxtpx:cad>`);
    parts.push('        </gpxtpx:TrackPointExtension>');
    if (power !== undefined) parts.push(`        <power>${power}</power>`);
    parts.push('      </extensions>');
  }
  parts.push('    </trkpt>');
  return parts.join('\n');
}

export function serializeGpx(points: TrackPoint[], name: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Tooling Suite" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <name>${esc(name)}</name>
    <trkseg>
${points.map(trkptXml).join('\n')}
    </trkseg>
  </trk>
</gpx>`;
}

export function serializeGpxSegments(segments: TrackPoint[][], name: string): string {
  const segs = segments
    .map((seg) => `    <trkseg>\n${seg.map(trkptXml).join('\n')}\n    </trkseg>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Tooling Suite" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <name>${esc(name)}</name>
${segs}
  </trk>
</gpx>`;
}
