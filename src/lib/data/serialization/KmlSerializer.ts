import type { TrackPoint } from '../../domain/entities/TrackPoint';
import { formatCoord, formatNum } from './format';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Serialize track points to KML 2.2 as a single Placemark/LineString.
 * Coordinates are `lon,lat,ele` (KML order), space-separated; missing
 * elevation is written as 0.
 */
export function serializeKml(points: TrackPoint[], name: string): string {
  const coords = points
    .map((p) => `${formatCoord(p.longitude)},${formatCoord(p.latitude)},${formatNum(p.elevation ?? 0)}`)
    .join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(name)}</name>
    <Placemark>
      <name>${esc(name)}</name>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
}
