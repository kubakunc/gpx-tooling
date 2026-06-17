import type { TrackPoint } from '../../domain/entities/TrackPoint';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trackpointXml(p: TrackPoint): string {
  const parts: string[] = ['        <Trackpoint>'];
  if (p.time !== null) parts.push(`          <Time>${p.time.toISOString()}</Time>`);
  parts.push('          <Position>');
  parts.push(`            <LatitudeDegrees>${p.latitude}</LatitudeDegrees>`);
  parts.push(`            <LongitudeDegrees>${p.longitude}</LongitudeDegrees>`);
  parts.push('          </Position>');
  if (p.elevation !== null) parts.push(`          <AltitudeMeters>${p.elevation}</AltitudeMeters>`);
  const { hr, cadence, power } = p.sensors;
  if (hr !== undefined) {
    parts.push('          <HeartRateBpm>');
    parts.push(`            <Value>${hr}</Value>`);
    parts.push('          </HeartRateBpm>');
  }
  if (cadence !== undefined) parts.push(`          <Cadence>${cadence}</Cadence>`);
  if (power !== undefined) {
    parts.push('          <Extensions>');
    parts.push('            <TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2">');
    parts.push(`              <Watts>${power}</Watts>`);
    parts.push('            </TPX>');
    parts.push('          </Extensions>');
  }
  parts.push('        </Trackpoint>');
  return parts.join('\n');
}

/**
 * Serialize track points to Garmin TCX (Training Center Database). Emits a
 * single Biking activity/lap/track. Only fields present on a point are
 * written. The activity Id uses the first timestamp when available.
 */
export function serializeTcx(points: TrackPoint[], name: string): string {
  const startTime = points.find((p) => p.time !== null)?.time?.toISOString();
  const id = startTime ?? esc(name);
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Biking">
      <Id>${id}</Id>
      <Lap>
        <Track>
${points.map(trackpointXml).join('\n')}
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
}
