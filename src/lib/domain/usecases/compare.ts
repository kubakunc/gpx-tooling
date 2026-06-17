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
  /** Joint min value across both (shifted) series, or null when both empty. */
  valueMin: number | null;
  /** Joint max value across both (shifted) series, or null when both empty. */
  valueMax: number | null;
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

/** Quote a CSV field if it contains a comma, quote, or newline (RFC 4180). */
function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Build a CSV of a comparison: a header row plus one row per sample for each
 * series (tagged A/B). B's `t` is already shifted by `shiftSeconds` (it lives
 * in `result.seriesB`), so the export matches exactly what's plotted.
 *
 * The emitted fields today are a fixed metric label plus numbers, so none need
 * escaping; `csvField` is applied anyway so the export stays correct (won't
 * corrupt) if the labels ever change to contain commas/quotes/newlines.
 */
export function comparisonToCsv(result: CompareResult, metric: CompareMetric): string {
  const lines = [['series', 't_seconds', metric].map(csvField).join(',')];
  for (const s of result.seriesA) lines.push(['A', s.t, s.v].map((c) => csvField(String(c))).join(','));
  for (const s of result.seriesB) lines.push(['B', s.t, s.v].map((c) => csvField(String(c))).join(','));
  return lines.join('\n');
}

/** Mean of the values whose `t` falls within `[start, end]`, or null if none. */
function averageInWindow(series: Sample[], start: number, end: number): number | null {
  let sum = 0;
  let n = 0;
  for (const s of series) {
    if (s.t >= start && s.t <= end) {
      sum += s.v;
      n++;
    }
  }
  return n === 0 ? null : sum / n;
}

/**
 * Compare two tracks on a single sensor metric. `seriesB` has `shiftSeconds`
 * added to each sample's `t` (to align devices that started at different times).
 *
 * Averages are computed over the *overlapping time window* after the shift:
 * `[max(minTA, minTB'), min(maxTA, maxTB')]`. This keeps the stats in sync with
 * the chart — dragging the shift changes which samples overlap, so the averages
 * and `diffPercent` move with the shift instead of being whole-series means.
 * When there is no overlap (or either series is empty), the avgs/diff are null
 * (the screen renders "—"). The full (shifted) series are still returned so the
 * chart can plot everything.
 */
export function compareTracks(
  a: TrackPoint[],
  b: TrackPoint[],
  metric: CompareMetric,
  shiftSeconds: number
): CompareResult {
  const seriesA = extractSeries(a, metric);
  const seriesB = extractSeries(b, metric).map((s) => ({ t: s.t + shiftSeconds, v: s.v }));

  let avgA: number | null = null;
  let avgB: number | null = null;
  if (seriesA.length > 0 && seriesB.length > 0) {
    const minTA = seriesA[0].t;
    const maxTA = seriesA[seriesA.length - 1].t;
    const minTB = seriesB[0].t;
    const maxTB = seriesB[seriesB.length - 1].t;
    const overlapStart = Math.max(minTA, minTB);
    const overlapEnd = Math.min(maxTA, maxTB);
    if (overlapStart <= overlapEnd) {
      avgA = averageInWindow(seriesA, overlapStart, overlapEnd);
      avgB = averageInWindow(seriesB, overlapStart, overlapEnd);
    }
  }

  const diffPercent =
    avgA !== null && avgB !== null && avgA !== 0 ? ((avgB - avgA) / avgA) * 100 : null;

  let valueMin: number | null = null;
  let valueMax: number | null = null;
  for (const s of seriesA) {
    if (valueMin === null || s.v < valueMin) valueMin = s.v;
    if (valueMax === null || s.v > valueMax) valueMax = s.v;
  }
  for (const s of seriesB) {
    if (valueMin === null || s.v < valueMin) valueMin = s.v;
    if (valueMax === null || s.v > valueMax) valueMax = s.v;
  }

  return { seriesA, seriesB, avgA, avgB, diffPercent, valueMin, valueMax };
}
