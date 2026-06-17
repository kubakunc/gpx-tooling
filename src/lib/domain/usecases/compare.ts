import type { TrackPoint } from '../entities/TrackPoint';

/** Sensor metrics the Compare tool can chart. */
export const COMPARE_METRICS = ['power', 'hr', 'cadence'] as const;
export type CompareMetric = (typeof COMPARE_METRICS)[number];

/** A single time/value sample: `t` is seconds from the track's first timed point. */
export interface Sample {
  t: number;
  v: number;
}

export interface CompareResult {
  seriesA: Sample[];
  seriesB: Sample[];
  avgA: number | null;
  avgB: number | null;
  diffPercent: number | null;
}

/**
 * Extract a time/value series for `metric` from `points`. Only points that have
 * both a non-null `time` and a present sensor value for the metric are kept.
 * `t` is measured in seconds from the track's first timed point.
 */
export function extractSeries(points: TrackPoint[], metric: CompareMetric): Sample[] {
  let originMs: number | null = null;
  const out: Sample[] = [];
  for (const p of points) {
    if (p.time === null) continue;
    if (originMs === null) originMs = p.time.getTime();
    const v = p.sensors[metric];
    if (v === undefined) continue;
    out.push({ t: (p.time.getTime() - originMs) / 1000, v });
  }
  return out;
}

/**
 * Build SVG polyline `points` strings for both series scaled into a `width` x
 * `height` box. X is shared time domain (min→max across both series), Y is the
 * shared value domain. Returns `''` for an empty series. A flat/degenerate
 * domain maps to the box centre so a single point still renders.
 */
export function buildChartPaths(
  seriesA: Sample[],
  seriesB: Sample[],
  width: number,
  height: number
): { a: string; b: string } {
  const all = [...seriesA, ...seriesB];
  if (all.length === 0) return { a: '', b: '' };

  let tMin = Infinity, tMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (const s of all) {
    if (s.t < tMin) tMin = s.t;
    if (s.t > tMax) tMax = s.t;
    if (s.v < vMin) vMin = s.v;
    if (s.v > vMax) vMax = s.v;
  }
  const tSpan = tMax - tMin || 1;
  const vSpan = vMax - vMin || 1;

  const toPath = (series: Sample[]): string =>
    series
      .map((s) => {
        const x = ((s.t - tMin) / tSpan) * width;
        // Invert Y so larger values sit higher in the SVG box.
        const y = height - ((s.v - vMin) / vSpan) * height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

  return { a: toPath(seriesA), b: toPath(seriesB) };
}

/**
 * Build a CSV of a comparison: a header row plus one row per sample for each
 * series (tagged A/B). Used by "Save comparison" via the file share.
 */
export function comparisonToCsv(result: CompareResult, metric: CompareMetric): string {
  const lines = [`series,t_seconds,${metric}`];
  for (const s of result.seriesA) lines.push(`A,${s.t},${s.v}`);
  for (const s of result.seriesB) lines.push(`B,${s.t},${s.v}`);
  return lines.join('\n');
}

function average(series: Sample[]): number | null {
  if (series.length === 0) return null;
  let sum = 0;
  for (const s of series) sum += s.v;
  return sum / series.length;
}

/**
 * Compare two tracks on a single sensor metric. `seriesB` has `shiftSeconds`
 * added to each sample's `t` (to align devices that started at different times).
 * Averages are over each series' values; `diffPercent` is the relative
 * difference of B vs A, or null when it cannot be computed.
 */
export function compareTracks(
  a: TrackPoint[],
  b: TrackPoint[],
  metric: CompareMetric,
  shiftSeconds: number
): CompareResult {
  const seriesA = extractSeries(a, metric);
  const seriesB = extractSeries(b, metric).map((s) => ({ t: s.t + shiftSeconds, v: s.v }));
  const avgA = average(seriesA);
  const avgB = average(seriesB);
  const diffPercent =
    avgA !== null && avgB !== null && avgA !== 0 ? ((avgB - avgA) / avgA) * 100 : null;
  return { seriesA, seriesB, avgA, avgB, diffPercent };
}
