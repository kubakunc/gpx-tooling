import type { GpxFile } from '../../domain/entities/GpxFile';
import type { TrackPoint, Sensors } from '../../domain/entities/TrackPoint';
import { ParseError } from '../../domain/errors';

function num(v: string | null | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function readSensors(trkpt: Element): Sensors {
  const sensors: Sensors = {};
  const ext = trkpt.getElementsByTagName('extensions')[0];
  if (!ext) return sensors;
  const walk = ext.getElementsByTagName('*');
  for (let i = 0; i < walk.length; i++) {
    const el = walk[i];
    // Namespace-agnostic: some XML parsers (e.g. happy-dom) report the full
    // prefixed name in `localName` (e.g. "gpxtpx:hr") instead of stripping the
    // prefix, so drop anything before the colon ourselves.
    const local = el.localName.toLowerCase().replace(/^.*:/, '');
    const val = num(el.textContent);
    if (val === null) continue;
    if (local === 'hr') sensors.hr = val;
    else if (local === 'cad') sensors.cadence = val;
    else if (local === 'power' || local === 'powerinwatts') sensors.power = val;
  }
  return sensors;
}

export function parseGpx(xml: string, name: string): GpxFile {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new ParseError(`Malformed GPX: ${name}`);
  }
  const trkpts = doc.getElementsByTagName('trkpt');
  if (trkpts.length === 0) throw new ParseError(`No trackpoints in ${name}`);
  const points: TrackPoint[] = [];
  for (let i = 0; i < trkpts.length; i++) {
    const t = trkpts[i];
    const lat = num(t.getAttribute('lat'));
    const lon = num(t.getAttribute('lon'));
    if (lat === null || lon === null) {
      throw new ParseError(`Trackpoint ${i} missing lat/lon in ${name}`);
    }
    const eleEl = t.getElementsByTagName('ele')[0];
    const timeEl = t.getElementsByTagName('time')[0];
    const time = timeEl?.textContent ? new Date(timeEl.textContent) : null;
    points.push({
      latitude: lat,
      longitude: lon,
      elevation: eleEl ? num(eleEl.textContent) : null,
      time: time && !isNaN(time.getTime()) ? time : null,
      sensors: readSensors(t),
    });
  }
  return { name, points };
}
