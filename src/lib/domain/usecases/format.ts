/** Presentation helpers for domain stats (pure, locale-free). */

/** Unit system for displayed distances, elevations and speeds. */
export type Units = 'metric' | 'imperial';

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;
const KMH_PER_MPH = 1.609344;

/**
 * Meters → "12.3 km" (metric) / "7.6 mi" (imperial, m / 1609.344).
 * Pure: the unit system is passed in, never read from a store.
 */
export function formatDistance(meters: number, units: Units): string {
  return units === 'imperial'
    ? `${(meters / METERS_PER_MILE).toFixed(1)} mi`
    : `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Meters of elevation → "312 m" (metric) / "1024 ft" (imperial, m * 3.28084).
 * Pure: the unit system is passed in, never read from a store.
 */
export function formatElevation(meters: number, units: Units): string {
  return units === 'imperial'
    ? `${Math.round(meters * FEET_PER_METER)} ft`
    : `${Math.round(meters)} m`;
}

/**
 * Meters of gain → "+312 m" (metric) / "+1024 ft" (imperial, m * 3.28084).
 * Pure: the unit system is passed in, never read from a store.
 */
export function formatGain(meters: number, units: Units): string {
  return units === 'imperial'
    ? `+${Math.round(meters * FEET_PER_METER)} ft`
    : `+${Math.round(meters)} m`;
}

/**
 * km/h → "15.6 km/h" (metric) / "9.7 mph" (imperial, kmh / 1.609344);
 * null (untimed) → "—". Pure: the unit system is passed in.
 */
export function formatSpeed(kmh: number | null, units: Units): string {
  if (kmh === null) return '—';
  return units === 'imperial'
    ? `${(kmh / KMH_PER_MPH).toFixed(1)} mph`
    : `${kmh.toFixed(1)} km/h`;
}

/** Seconds → "H:MM:SS" (or "M:SS" under an hour). */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Byte count → "0.5 MB" / "12.3 KB" / "840 B". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Derive an export filename from a source name.
 *   exportName('morning.gpx', 'trimmed')      → 'morning-trimmed.gpx'
 *   exportName('ride.track.GPX', 'reduced')   → 'ride.track-reduced.gpx'
 *   exportName('', 'merged')                  → 'merged.gpx'
 * Strips a trailing `.gpx` (case-insensitive) from the source, then appends
 * `-{suffix}.{ext}`. Falls back to `{suffix}.{ext}` when source is empty.
 */
export function exportName(sourceName: string, suffix: string, ext = 'gpx'): string {
  // Strip a trailing known track extension (gpx/fit/tcx/kml), case-insensitive.
  const base = sourceName.replace(/\.(gpx|fit|tcx|kml)$/i, '').trim();
  if (!base) return suffix ? `${suffix}.${ext}` : `track.${ext}`;
  return suffix ? `${base}-${suffix}.${ext}` : `${base}.${ext}`;
}

/**
 * Epoch milliseconds → local clock "HH:MM" (24h, zero-padded). Returns "no time"
 * when the timestamp is null (untimed file).
 *   formatClock(Date.parse('2026-01-01T08:05:00')) → "08:05"
 *   formatClock(null)                              → "no time"
 */
export function formatClock(ms: number | null): string {
  if (ms === null) return 'no time';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Integer → grouped with thin spaces, e.g. 8412 → "8 412". */
export function formatCount(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
