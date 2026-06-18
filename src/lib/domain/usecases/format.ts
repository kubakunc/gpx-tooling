/** Presentation helpers for domain stats (pure, locale-free). */

/** Meters → "12.3 km". */
export function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Meters of gain → "+312 m". */
export function formatGain(meters: number): string {
  return `+${Math.round(meters)} m`;
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
