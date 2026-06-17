# Phase 3: GPX Processing Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development with superpowers:test-driven-development. Steps use checkbox (`- [ ]`) syntax. Every function ships with tests; the project requires **≥90% coverage** (enforced by a Vitest threshold gate, Task 1).

**Goal:** Implement the pure-TypeScript GPX engine — domain entities + use-cases (stats, trim, RDP simplify, elevation repair, chronological merge) and the data layer (DOMParser-based `GpxParser`, `GpxSerializer`) tied together by the `GpxProcessor` facade — all under TDD with ≥90% coverage.

**Architecture:** Hexagonal-lite. `src/lib/domain/` is pure (no DOM, no Capacitor): entities + use-cases as deterministic functions over `TrackPoint[]`. `src/lib/data/` adapts the outside world: `GpxParser` uses the WebView `DOMParser` (tests run under `happy-dom`), `GpxSerializer` builds GPX 1.1 XML via string templating. `GpxProcessor` orchestrates parse → process → serialize.

**Tech Stack:** TypeScript strict, Vitest (+ `@vitest/coverage-v8`, `happy-dom` for DOM tests).

**Reference:** `docs/superpowers/specs/2026-06-17-gpx-tooling-suite-design.md` §2 (entities) and §4 (GpxProcessor).

---

## Design decisions (so the implementer doesn't guess)
- **TrackPoint:** `{ latitude:number; longitude:number; elevation:number|null; time:Date|null; sensors:Sensors }`, `Sensors = { hr?:number; cadence?:number; power?:number }`.
- **GpxFile:** `{ name:string; points:TrackPoint[] }`.
- **Distance:** haversine, Earth radius `6371000` m.
- **RDP perpendicular distance:** compute in **meters** via a local equirectangular projection around each segment (x = R·Δlon·cos(lat₀), y = R·Δlat). Epsilon `ε` is in meters. Always keep first & last points. A 2-point (or shorter) input returns unchanged.
- **Elevation repair:** a point `i` (with `1 ≤ i ≤ n-2`) is a spike when `|ele[i]-ele[i-1]| > maxJumpM` (default 100) **and** the time gap to the previous point is `< minSeconds` (default 1) — OR, when times are missing, when both neighbor deltas exceed the jump and reverse sign (an isolated outlier). Repair by linear interpolation between the two neighbors. Points with `null` elevation are skipped.
- **Merge:** concatenate all input points, then **stable sort by time ascending**; points with `time===null` sort *after* timed points, preserving their original relative order. Sensors are carried untouched.
- **Sensor parsing (GPX extensions):** match by element `localName` (namespace-agnostic): `hr`→hr, `cad`→cadence, `power` or `PowerInWatts`→power. Inside `<extensions>`, typically Garmin `TrackPointExtension`.
- **GpxParser:** throw `ParseError` on malformed XML (DOMParser `<parsererror>`) or when no `<trkpt>` found. Lat/lon required & finite; `ele`/`time` optional (→ null).
- **GpxSerializer:** GPX 1.1, one `<trk><trkseg>`; XML-escape text; ISO-8601 `time`; emit sensor extensions only when present.

---

### Task 1: Coverage tooling + Vitest config
**Files:** Modify `package.json`, `vite.config.ts`.

- [ ] **Step 1:** Add devDeps: `"@vitest/coverage-v8": "^2.1.0"`, `"happy-dom": "^15.0.0"`. Run `npm install`.
- [ ] **Step 2:** Update `vite.config.ts` `test` block:
```ts
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/domain/**', 'src/lib/data/**'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 }
    }
  }
```
- [ ] **Step 3:** Add script `"test:coverage": "vitest run --coverage"` to `package.json`.
- [ ] **Step 4:** Run `npm run check` (0 errors). Commit: `chore: add vitest coverage gate (90%) + happy-dom`.

---

### Task 2: Entities + errors
**Files:** Create `src/lib/domain/entities/TrackPoint.ts`, `src/lib/domain/entities/GpxFile.ts`, `src/lib/domain/errors.ts`.

- [ ] **Step 1:** Create `src/lib/domain/errors.ts`:
```ts
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}
```
- [ ] **Step 2:** Create `src/lib/domain/entities/TrackPoint.ts`:
```ts
export interface Sensors {
  hr?: number;
  cadence?: number;
  power?: number;
}

export interface TrackPoint {
  latitude: number;
  longitude: number;
  elevation: number | null;
  time: Date | null;
  sensors: Sensors;
}
```
- [ ] **Step 3:** Create `src/lib/domain/entities/GpxFile.ts`:
```ts
import type { TrackPoint } from './TrackPoint';

export interface GpxFile {
  name: string;
  points: TrackPoint[];
}
```
- [ ] **Step 4:** Run `npm run check`. Commit: `feat: add TrackPoint/GpxFile entities and ParseError`.

---

### Task 3: Geo helpers (haversine + projection) — TDD
**Files:** Create `src/lib/domain/usecases/geo.test.ts`, then `src/lib/domain/usecases/geo.ts`.

- [ ] **Step 1 (failing test):** `geo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { haversineMeters, perpendicularDistanceMeters } from './geo';

describe('haversineMeters', () => {
  it('is zero for identical points', () => {
    expect(haversineMeters(50, 19, 50, 19)).toBe(0);
  });
  it('approximates one degree of latitude as ~111 km', () => {
    const d = haversineMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });
});

describe('perpendicularDistanceMeters', () => {
  it('is zero when the point lies on the segment', () => {
    const d = perpendicularDistanceMeters(
      { lat: 0.5, lon: 0 }, { lat: 0, lon: 0 }, { lat: 1, lon: 0 }
    );
    expect(d).toBeLessThan(1);
  });
  it('measures offset from the segment in meters', () => {
    const d = perpendicularDistanceMeters(
      { lat: 0, lon: 0.001 }, { lat: -1, lon: 0 }, { lat: 1, lon: 0 }
    );
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
  it('falls back to point distance for a zero-length segment', () => {
    const d = perpendicularDistanceMeters(
      { lat: 0, lon: 0 }, { lat: 1, lon: 1 }, { lat: 1, lon: 1 }
    );
    expect(d).toBeGreaterThan(0);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run src/lib/domain/usecases/geo.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Create `geo.ts`:
```ts
const R = 6371000; // Earth radius, meters
const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface LatLon { lat: number; lon: number; }

// Local equirectangular projection to meters, origin at `a`.
function project(p: LatLon, originLat: number): { x: number; y: number } {
  return {
    x: R * toRad(p.lon) * Math.cos(toRad(originLat)),
    y: R * toRad(p.lat),
  };
}

export function perpendicularDistanceMeters(p: LatLon, a: LatLon, b: LatLon): number {
  const o = a.lat;
  const pp = project(p, o), pa = project(a, o), pb = project(b, o);
  const dx = pb.x - pa.x, dy = pb.y - pa.y;
  const segLen2 = dx * dx + dy * dy;
  if (segLen2 === 0) return Math.hypot(pp.x - pa.x, pp.y - pa.y);
  const cross = Math.abs(dy * (pp.x - pa.x) - dx * (pp.y - pa.y));
  return cross / Math.sqrt(segLen2);
}
```
- [ ] **Step 4:** Run the test → PASS. Commit: `feat: add geo helpers (haversine, perpendicular distance)`.

---

### Task 4: Stats — TDD
**Files:** Create `src/lib/domain/usecases/stats.test.ts`, then `stats.ts`.

- [ ] **Step 1 (failing test):**
```ts
import { describe, it, expect } from 'vitest';
import { totalDistanceMeters, elevationGainMeters, durationSeconds } from './stats';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (lat: number, lon: number, ele: number | null = null, t: string | null = null): TrackPoint => ({
  latitude: lat, longitude: lon, elevation: ele, time: t ? new Date(t) : null, sensors: {},
});

describe('stats', () => {
  it('totalDistanceMeters sums segment lengths; 0 for <2 points', () => {
    expect(totalDistanceMeters([])).toBe(0);
    expect(totalDistanceMeters([tp(0, 0)])).toBe(0);
    const d = totalDistanceMeters([tp(0, 0), tp(0, 1), tp(0, 2)]);
    expect(d).toBeGreaterThan(220000);
    expect(d).toBeLessThan(224000);
  });
  it('elevationGainMeters sums only positive deltas, ignoring nulls', () => {
    expect(elevationGainMeters([tp(0, 0, 100), tp(0, 0, 110), tp(0, 0, 105), tp(0, 0, 130)])).toBe(35);
    expect(elevationGainMeters([tp(0, 0, null), tp(0, 0, 110), tp(0, 0, null), tp(0, 0, 130)])).toBe(20);
  });
  it('durationSeconds is the gap between first and last timed points; 0 if untimed', () => {
    expect(durationSeconds([tp(0, 0, null, '2026-01-01T00:00:00Z'), tp(0, 0, null, '2026-01-01T00:01:40Z')])).toBe(100);
    expect(durationSeconds([tp(0, 0)])).toBe(0);
  });
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Create `stats.ts`:
```ts
import type { TrackPoint } from '../entities/TrackPoint';
import { haversineMeters } from './geo';

export function totalDistanceMeters(points: TrackPoint[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    sum += haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
  }
  return sum;
}

export function elevationGainMeters(points: TrackPoint[]): number {
  let gain = 0;
  let prev: number | null = null;
  for (const p of points) {
    if (p.elevation === null) continue;
    if (prev !== null && p.elevation > prev) gain += p.elevation - prev;
    prev = p.elevation;
  }
  return gain;
}

export function durationSeconds(points: TrackPoint[]): number {
  const timed = points.filter((p) => p.time !== null);
  if (timed.length < 2) return 0;
  const first = timed[0].time!.getTime();
  const last = timed[timed.length - 1].time!.getTime();
  return Math.round((last - first) / 1000);
}
```
- [ ] **Step 4:** Run → PASS. Commit: `feat: add track stats (distance, gain, duration)`.

---

### Task 5: Trim — TDD
**Files:** Create `src/lib/domain/usecases/trim.test.ts`, then `trim.ts`.

- [ ] **Step 1 (failing test):**
```ts
import { describe, it, expect } from 'vitest';
import { trimGpx } from './trim';
import type { TrackPoint } from '../entities/TrackPoint';

const pts = (n: number): TrackPoint[] =>
  Array.from({ length: n }, (_, i) => ({ latitude: i, longitude: 0, elevation: null, time: null, sensors: {} }));

describe('trimGpx', () => {
  it('keeps the inclusive index range mapped from ratios', () => {
    const r = trimGpx(pts(10), 0.2, 0.8);
    expect(r[0].latitude).toBe(2);
    expect(r[r.length - 1].latitude).toBe(8);
  });
  it('returns the whole track for 0..1', () => {
    expect(trimGpx(pts(5), 0, 1)).toHaveLength(5);
  });
  it('throws when start >= end or ratios out of [0,1]', () => {
    expect(() => trimGpx(pts(5), 0.6, 0.4)).toThrow();
    expect(() => trimGpx(pts(5), -0.1, 1)).toThrow();
    expect(() => trimGpx(pts(5), 0, 1.1)).toThrow();
  });
  it('returns [] for empty input', () => {
    expect(trimGpx([], 0, 1)).toEqual([]);
  });
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Create `trim.ts`:
```ts
import type { TrackPoint } from '../entities/TrackPoint';

export function trimGpx(points: TrackPoint[], startRatio: number, endRatio: number): TrackPoint[] {
  if (startRatio < 0 || endRatio > 1 || startRatio >= endRatio) {
    throw new RangeError(`Invalid trim ratios: ${startRatio}..${endRatio}`);
  }
  if (points.length === 0) return [];
  const lastIdx = points.length - 1;
  const start = Math.round(startRatio * lastIdx);
  const end = Math.round(endRatio * lastIdx);
  return points.slice(start, end + 1);
}
```
- [ ] **Step 4:** Run → PASS. Commit: `feat: add trimGpx`.

---

### Task 6: RDP simplification — TDD
**Files:** Create `src/lib/domain/usecases/simplify.test.ts`, then `simplify.ts`.

- [ ] **Step 1 (failing test):**
```ts
import { describe, it, expect } from 'vitest';
import { simplifyRdp } from './simplify';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (lat: number, lon: number): TrackPoint => ({ latitude: lat, longitude: lon, elevation: null, time: null, sensors: {} });

describe('simplifyRdp', () => {
  it('returns input unchanged when it has <=2 points', () => {
    expect(simplifyRdp([tp(0, 0)], 10)).toHaveLength(1);
    expect(simplifyRdp([tp(0, 0), tp(1, 1)], 10)).toHaveLength(2);
  });
  it('drops near-collinear middle points under epsilon', () => {
    const line = [tp(0, 0), tp(0, 0.5), tp(0, 1)]; // middle is on the line
    expect(simplifyRdp(line, 10)).toHaveLength(2);
  });
  it('keeps a middle point whose deviation exceeds epsilon', () => {
    const bent = [tp(0, 0), tp(0.01, 0.5), tp(0, 1)]; // ~1.1km deviation
    expect(simplifyRdp(bent, 10)).toHaveLength(3);
  });
  it('always keeps first and last', () => {
    const r = simplifyRdp([tp(0, 0), tp(0, 0.5), tp(0, 1)], 1e9);
    expect(r[0]).toEqual(tp(0, 0));
    expect(r[r.length - 1]).toEqual(tp(0, 1));
  });
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Create `simplify.ts`:
```ts
import type { TrackPoint } from '../entities/TrackPoint';
import { perpendicularDistanceMeters } from './geo';

const ll = (p: TrackPoint) => ({ lat: p.latitude, lon: p.longitude });

export function simplifyRdp(points: TrackPoint[], epsilonMeters: number): TrackPoint[] {
  if (points.length <= 2) return points.slice();
  let maxDist = 0;
  let index = 0;
  const a = points[0], b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistanceMeters(ll(points[i]), ll(a), ll(b));
    if (d > maxDist) { maxDist = d; index = i; }
  }
  if (maxDist > epsilonMeters) {
    const left = simplifyRdp(points.slice(0, index + 1), epsilonMeters);
    const right = simplifyRdp(points.slice(index), epsilonMeters);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}
```
- [ ] **Step 4:** Run → PASS. Commit: `feat: add RDP simplification`.

---

### Task 7: Elevation repair — TDD
**Files:** Create `src/lib/domain/usecases/repairElevation.test.ts`, then `repairElevation.ts`.

- [ ] **Step 1 (failing test):**
```ts
import { describe, it, expect } from 'vitest';
import { repairElevation } from './repairElevation';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (ele: number | null, t?: string): TrackPoint => ({
  latitude: 0, longitude: 0, elevation: ele, time: t ? new Date(t) : null, sensors: {},
});

describe('repairElevation', () => {
  it('interpolates a >100m spike across a <1s gap', () => {
    const r = repairElevation([
      tp(100, '2026-01-01T00:00:00Z'),
      tp(900, '2026-01-01T00:00:00.500Z'), // spike
      tp(110, '2026-01-01T00:00:01Z'),
    ]);
    expect(r[1].elevation).toBeCloseTo(105, 0);
  });
  it('leaves a legitimate gradual climb untouched', () => {
    const input = [tp(100, '2026-01-01T00:00:00Z'), tp(150, '2026-01-01T00:01:00Z'), tp(200, '2026-01-01T00:02:00Z')];
    expect(repairElevation(input).map((p) => p.elevation)).toEqual([100, 150, 200]);
  });
  it('does not mutate the input array', () => {
    const input = [tp(100, '2026-01-01T00:00:00Z'), tp(900, '2026-01-01T00:00:00.500Z'), tp(110, '2026-01-01T00:00:01Z')];
    const before = input[1].elevation;
    repairElevation(input);
    expect(input[1].elevation).toBe(before);
  });
  it('skips points with null elevation', () => {
    const input = [tp(null), tp(null), tp(null)];
    expect(repairElevation(input).map((p) => p.elevation)).toEqual([null, null, null]);
  });
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Create `repairElevation.ts`:
```ts
import type { TrackPoint } from '../entities/TrackPoint';

export interface RepairOptions { maxJumpMeters?: number; minSeconds?: number; }

export function repairElevation(points: TrackPoint[], opts: RepairOptions = {}): TrackPoint[] {
  const maxJump = opts.maxJumpMeters ?? 100;
  const minSeconds = opts.minSeconds ?? 1;
  const out = points.map((p) => ({ ...p, sensors: { ...p.sensors } }));
  for (let i = 1; i < out.length - 1; i++) {
    const prev = out[i - 1], cur = out[i], next = out[i + 1];
    if (prev.elevation === null || cur.elevation === null || next.elevation === null) continue;
    const jump = Math.abs(cur.elevation - prev.elevation);
    let suddenInTime = false;
    if (cur.time && prev.time) {
      suddenInTime = (cur.time.getTime() - prev.time.getTime()) / 1000 < minSeconds;
    }
    const isolatedOutlier =
      Math.abs(cur.elevation - prev.elevation) > maxJump &&
      Math.abs(cur.elevation - next.elevation) > maxJump &&
      Math.sign(cur.elevation - prev.elevation) === Math.sign(cur.elevation - next.elevation);
    if (jump > maxJump && (suddenInTime || isolatedOutlier)) {
      cur.elevation = (prev.elevation + next.elevation) / 2;
    }
  }
  return out;
}
```
- [ ] **Step 4:** Run → PASS. Commit: `feat: add elevation spike repair`.

---

### Task 8: Chronological merge — TDD
**Files:** Create `src/lib/domain/usecases/merge.test.ts`, then `merge.ts`.

- [ ] **Step 1 (failing test):**
```ts
import { describe, it, expect } from 'vitest';
import { mergeChronologically } from './merge';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (lat: number, t: string | null, hr?: number): TrackPoint => ({
  latitude: lat, longitude: 0, elevation: null, time: t ? new Date(t) : null, sensors: hr ? { hr } : {},
});

describe('mergeChronologically', () => {
  it('interleaves points from multiple tracks by time and preserves sensors', () => {
    const a = [tp(1, '2026-01-01T00:00:00Z', 120), tp(2, '2026-01-01T00:02:00Z')];
    const b = [tp(3, '2026-01-01T00:01:00Z', 130)];
    const r = mergeChronologically([a, b]);
    expect(r.map((p) => p.latitude)).toEqual([1, 3, 2]);
    expect(r[0].sensors.hr).toBe(120);
    expect(r[1].sensors.hr).toBe(130);
  });
  it('places untimed points after timed ones, stably', () => {
    const a = [tp(1, null), tp(2, '2026-01-01T00:00:00Z')];
    const r = mergeChronologically([a]);
    expect(r.map((p) => p.latitude)).toEqual([2, 1]);
  });
  it('returns [] for no input', () => {
    expect(mergeChronologically([])).toEqual([]);
  });
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Create `merge.ts`:
```ts
import type { TrackPoint } from '../entities/TrackPoint';

export function mergeChronologically(tracks: TrackPoint[][]): TrackPoint[] {
  const all = tracks.flat();
  return all
    .map((p, i) => ({ p, i }))
    .sort((x, y) => {
      const tx = x.p.time ? x.p.time.getTime() : Infinity;
      const ty = y.p.time ? y.p.time.getTime() : Infinity;
      if (tx !== ty) return tx - ty;
      return x.i - y.i; // stable: keep original order on ties / untimed
    })
    .map((e) => e.p);
}
```
- [ ] **Step 4:** Run → PASS. Commit: `feat: add chronological merge`.

---

### Task 9: GpxParser (DOMParser) — TDD under happy-dom
**Files:** Create `src/lib/data/parsing/GpxParser.test.ts`, then `GpxParser.ts`.

- [ ] **Step 1 (failing test):** First line of the test file selects the DOM env:
```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseGpx } from './GpxParser';
import { ParseError } from '../../domain/errors';

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk><name>t</name><trkseg>
    <trkpt lat="49.1" lon="19.9"><ele>800</ele><time>2026-01-01T00:00:00Z</time>
      <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>140</gpxtpx:hr><gpxtpx:cad>88</gpxtpx:cad></gpxtpx:TrackPointExtension><power>250</power></extensions>
    </trkpt>
    <trkpt lat="49.2" lon="20.0"></trkpt>
  </trkseg></trk>
</gpx>`;

describe('parseGpx', () => {
  it('parses trackpoints with elevation, time and sensors', () => {
    const f = parseGpx(GPX, 'ride.gpx');
    expect(f.name).toBe('ride.gpx');
    expect(f.points).toHaveLength(2);
    expect(f.points[0]).toMatchObject({ latitude: 49.1, longitude: 19.9, elevation: 800 });
    expect(f.points[0].time?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(f.points[0].sensors).toEqual({ hr: 140, cadence: 88, power: 250 });
  });
  it('returns null elevation/time when absent and empty sensors', () => {
    const f = parseGpx(GPX, 'ride.gpx');
    expect(f.points[1].elevation).toBeNull();
    expect(f.points[1].time).toBeNull();
    expect(f.points[1].sensors).toEqual({});
  });
  it('throws ParseError on malformed XML', () => {
    expect(() => parseGpx('<gpx><trk', 'x.gpx')).toThrow(ParseError);
  });
  it('throws ParseError when there are no trackpoints', () => {
    expect(() => parseGpx('<?xml version="1.0"?><gpx></gpx>', 'x.gpx')).toThrow(ParseError);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run src/lib/data/parsing/GpxParser.test.ts` → FAIL.
- [ ] **Step 3:** Create `GpxParser.ts`:
```ts
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
    const local = el.localName.toLowerCase();
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
```
- [ ] **Step 4:** Run → PASS. Commit: `feat: add DOMParser-based GpxParser`.

---

### Task 10: GpxSerializer + round-trip — TDD under happy-dom
**Files:** Create `src/lib/data/serialization/GpxSerializer.test.ts`, then `GpxSerializer.ts`.

- [ ] **Step 1 (failing test):**
```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { serializeGpx } from './GpxSerializer';
import { parseGpx } from '../parsing/GpxParser';
import type { TrackPoint } from '../../domain/entities/TrackPoint';

const points: TrackPoint[] = [
  { latitude: 49.1, longitude: 19.9, elevation: 800, time: new Date('2026-01-01T00:00:00Z'), sensors: { hr: 140, cadence: 88, power: 250 } },
  { latitude: 49.2, longitude: 20.0, elevation: null, time: null, sensors: {} },
];

describe('serializeGpx', () => {
  it('produces XML that round-trips back to equivalent points', () => {
    const xml = serializeGpx(points, 'ride');
    expect(xml).toContain('<gpx');
    const back = parseGpx(xml, 'ride').points;
    expect(back[0]).toMatchObject({ latitude: 49.1, longitude: 19.9, elevation: 800 });
    expect(back[0].time?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(back[0].sensors).toEqual({ hr: 140, cadence: 88, power: 250 });
    expect(back[1].elevation).toBeNull();
    expect(back[1].time).toBeNull();
    expect(back[1].sensors).toEqual({});
  });
  it('XML-escapes the track name', () => {
    expect(serializeGpx([], 'a & b')).toContain('a &amp; b');
  });
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Create `GpxSerializer.ts`:
```ts
import type { TrackPoint } from '../../domain/entities/TrackPoint';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trkptXml(p: TrackPoint): string {
  const parts: string[] = [`    <trkpt lat="${p.latitude}" lon="${p.longitude}">`];
  if (p.elevation !== null) parts.push(`      <ele>${p.elevation}</ele>`);
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
```
- [ ] **Step 4:** Run → PASS. Commit: `feat: add GpxSerializer with sensor round-trip`.

---

### Task 11: GpxProcessor facade — TDD under happy-dom
**Files:** Create `src/lib/data/GpxProcessor.test.ts`, then `GpxProcessor.ts`.

- [ ] **Step 1 (failing test):**
```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { GpxProcessor } from './GpxProcessor';

const gpx = (lat: number, t: string) =>
  `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg><trkpt lat="${lat}" lon="0"><time>${t}</time></trkpt></trkseg></trk></gpx>`;

describe('GpxProcessor', () => {
  const proc = new GpxProcessor();
  it('parses then serializes (round-trip through the facade)', () => {
    const file = proc.parse(gpx(49.1, '2026-01-01T00:00:00Z'), 'a.gpx');
    const xml = proc.serialize(file.points, 'out');
    expect(proc.parse(xml, 'out').points[0].latitude).toBe(49.1);
  });
  it('merges files chronologically', () => {
    const a = proc.parse(gpx(1, '2026-01-01T00:02:00Z'), 'a.gpx');
    const b = proc.parse(gpx(2, '2026-01-01T00:01:00Z'), 'b.gpx');
    const merged = proc.merge([a, b]);
    expect(merged.points.map((p) => p.latitude)).toEqual([2, 1]);
  });
  it('exposes trim, simplify and repair over points', () => {
    const file = proc.parse(gpx(0, '2026-01-01T00:00:00Z'), 'a.gpx');
    expect(proc.trim(file.points, 0, 1).length).toBeGreaterThan(0);
    expect(Array.isArray(proc.simplify(file.points, 10))).toBe(true);
    expect(Array.isArray(proc.repairElevation(file.points))).toBe(true);
  });
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Create `GpxProcessor.ts`:
```ts
import type { GpxFile } from '../domain/entities/GpxFile';
import type { TrackPoint } from '../domain/entities/TrackPoint';
import { parseGpx } from './parsing/GpxParser';
import { serializeGpx } from './serialization/GpxSerializer';
import { mergeChronologically } from '../domain/usecases/merge';
import { trimGpx } from '../domain/usecases/trim';
import { simplifyRdp } from '../domain/usecases/simplify';
import { repairElevation, type RepairOptions } from '../domain/usecases/repairElevation';

export class GpxProcessor {
  parse(xml: string, name: string): GpxFile {
    return parseGpx(xml, name);
  }
  serialize(points: TrackPoint[], name: string): string {
    return serializeGpx(points, name);
  }
  merge(files: GpxFile[]): GpxFile {
    const points = mergeChronologically(files.map((f) => f.points));
    return { name: 'merged', points };
  }
  trim(points: TrackPoint[], start: number, end: number): TrackPoint[] {
    return trimGpx(points, start, end);
  }
  simplify(points: TrackPoint[], epsilonMeters: number): TrackPoint[] {
    return simplifyRdp(points, epsilonMeters);
  }
  repairElevation(points: TrackPoint[], opts?: RepairOptions): TrackPoint[] {
    return repairElevation(points, opts);
  }
}
```
- [ ] **Step 4:** Run → PASS. Commit: `feat: add GpxProcessor facade`.

---

### Task 12: Coverage gate verification
- [ ] **Step 1:** `npm run test:coverage` → all tests pass AND coverage thresholds met (≥90% lines/functions/branches/statements over `src/lib/domain` + `src/lib/data`). If any function is under, add targeted tests (e.g. malformed-time branch in the parser, zero-length-segment branch in geo) until the gate passes — do NOT lower the threshold.
- [ ] **Step 2:** `npm run check` → 0 errors, 0 warnings.
- [ ] **Step 3:** `npm run build` → succeeds.
- [ ] **Step 4:** Commit any added tests: `test: reach 90% coverage on the GPX engine`.

---

## Self-Review
- **Spec coverage (§4):** parser → Task 9; chronological merger → Task 8/11; trimmer → Task 5; RDP → Task 6; elevation repair → Task 7; serializer → Task 10; facade → Task 11. Entities (§2) → Task 2. ✓
- **Testing rule:** every function has a test; ≥90% enforced by the Task 1 gate and verified in Task 12. ✓
- **Placeholder scan:** none — every code step contains complete code.
- **Type consistency:** `TrackPoint`/`Sensors`/`GpxFile` shapes are identical across all tasks; `parseGpx(xml,name)`, `serializeGpx(points,name)`, `mergeChronologically(tracks)`, `trimGpx(points,start,end)`, `simplifyRdp(points,eps)`, `repairElevation(points,opts)` signatures match their call sites in `GpxProcessor`. ✓
- **Purity:** `domain/` imports nothing from `data/`, Capacitor, or the DOM; only `data/` touches `DOMParser` (tested via `happy-dom`). ✓
- **Out of scope (later phases):** FIT decoder, multi-format conversion (TCX/KML/FIT), Web Worker offloading, and wiring the engine into the UI screens.
