# Phase 5: FIT Decoder + Convert + Elevation Fix

> REQUIRED: subagent-driven-development + TDD. ≥90% coverage gate stays green. Three-stage review (spec, code, UX) after.

**Goal:** (1) A pure-TS **FIT binary decoder** behind a `TrackImporter` so `.fit` files import; (2) **TCX + KML serializers** and a wired **Convert** screen (export GPX/TCX/KML; FIT import-only); (3) wired **Elevation fix** (offline repair + smoothing on the track's GPS elevation).

**Scope decisions (defaults, flagged to user):** FIT is **import-only** — no FIT encoder; Convert exports **GPX/TCX/KML** only (FIT target disabled). Elevation uses **GPS source + offline smoothing**; SRTM/Mapbox stay "Soon".

**References:** spec `2026-06-17-gpx-tooling-suite-design.md` (§3 FIT seam); engine in `src/lib/{domain,data}`.

---

## Part A — FIT decoder + TrackImporter

### FIT format facts (implement precisely)
- **Header:** byte0 = header size (12 or 14). bytes: protocolVer(1), profileVer(uint16 LE), dataSize(uint32 LE) at offset 4, ".FIT" ASCII at offset 8 (validate). Data records begin after the header, span `dataSize` bytes; trailing 2-byte CRC. **Do NOT require CRC validation** (be lenient/robust).
- **Record header byte:** if `b & 0x80` → compressed-timestamp header (`localType = (b>>5)&0x3`, `timeOffset = b&0x1F`). Else normal: `b & 0x40` = definition message; `b & 0x20` = has developer data; `localType = b & 0x0F`.
- **Definition message:** reserved(1), architecture(1; 0=little-endian,1=big), globalMsgNum(uint16 per arch), numFields(1), then `numFields × (fieldDefNum(1), size(1), baseType(1))`. If developer flag: numDevFields(1), then `× (fieldNum(1), size(1), devDataIdx(1))`. Store per localType: `{arch, globalNum, fields:[{num,size,baseType}], devFields:[{size}]}`.
- **Data message:** for that localType's definition, read each field `size` bytes respecting `arch` endianness; skip dev fields by size. For compressed-timestamp data messages, apply `timeOffset` rollover to the last known timestamp (5-bit). 
- **record message** = globalNum **20**. Fields: `253` timestamp(uint32), `0` position_lat(sint32 semicircles), `1` position_long(sint32), `2` altitude(uint16), `78` enhanced_altitude(uint32), `3` heart_rate(uint8), `4` cadence(uint8), `7` power(uint16).
- **Conversions:** lat/lon degrees = `semicircles * (180 / 2^31)`. altitude m = `raw/5 - 500` (enhanced_altitude same). timestamp → `new Date((raw + 631065600) * 1000)` (FIT epoch 1989-12-31). **Invalid sentinels** (0xFF / 0xFFFF / 0x7FFFFFFF / 0xFFFFFFFF for the field's type) → treat as missing → null.

### A1: FIT base-type/byte readers (TDD)
- `src/lib/data/parsing/fit/binaryReader.ts`: a small reader over a `Uint8Array`/`DataView` with `readUint8/16/32`, `readSint32`, endianness param, position cursor; sentinel→null helpers (`isInvalid(value, baseType)`). TDD with crafted bytes (LE + BE).
- Commit `feat: add FIT binary reader`.

### A2: FIT decoder (TDD with a crafted FIT buffer)
- `src/lib/data/parsing/fit/FitParser.ts` → `parseFit(bytes: Uint8Array, name: string): GpxFile`. Parse header (validate ".FIT", else `ParseError`), iterate records honoring definition/data/compressed headers, collect record(20) messages → `TrackPoint[]`. Throw `ParseError` on bad header or zero records.
- Test helper `src/lib/data/parsing/fit/buildFitFixture.ts` (test-only or under test dir): builds a valid FIT `Uint8Array` (header with correct dataSize, one definition for record msg with fields timestamp/lat/long/altitude/hr/power, two data records, dummy 2-byte CRC). `FitParser.test.ts`: decode it, assert lat/lon (deg from semicircles), altitude (raw/5-500), time (FIT epoch), hr/power; assert sentinel→null; assert `ParseError` on non-".FIT" bytes and on empty record set.
- Commit `feat: add pure-TS FIT decoder`.

### A3: TrackImporter dispatch + FileService .fit
- `src/lib/data/parsing/TrackImporter.ts` → `importTrack(name: string, content: { text?: string; bytes?: Uint8Array }): GpxFile`: choose by extension (`.fit`→bytes→parseFit; `.gpx`→text→parseGpx) and/or magic bytes (".FIT" at offset 8). Throws `ParseError` for unknown/empty.
- Update `FileService.pickAndImportGpx` → rename concept to import both: accept `.gpx` and `.fit` in the picker, pass bytes for FIT (the picker already returns base64 `data`; decode to `Uint8Array`), route through `importTrack`. Keep per-file error collection. (Method may stay named `pickAndImportGpx` or rename to `pickAndImportTracks` — if renamed, update callers.)
- Tests: `TrackImporter.test.ts` (gpx text path, fit bytes path via the fixture, unknown→throws); extend `FileService.test.ts` for a mocked `.fit` pick.
- Commit `feat: add TrackImporter + FIT import via FileService`.

## Part B — Convert (TCX/KML serializers + wired screen)

### B1: TCX serializer (TDD)
- `src/lib/data/serialization/TcxSerializer.ts` → `serializeTcx(points, name): string`. Garmin TCX: `TrainingCenterDatabase/Activities/Activity[Sport=Biking]/Id/Lap/Track/Trackpoint` with `Time`(ISO), `Position/LatitudeDegrees+LongitudeDegrees`, `AltitudeMeters`, `HeartRateBpm/Value`, `Cadence`, `Extensions/TPX/Watts`. Emit only present fields. XML-escape. Test: contains expected elements; a `Trackpoint` per point; sensors present when set.
- Commit `feat: add TCX serializer`.

### B2: KML serializer (TDD)
- `src/lib/data/serialization/KmlSerializer.ts` → `serializeKml(points, name): string`. KML 2.2: `kml/Document/Placemark/LineString/coordinates` as `lon,lat,ele` space-separated (ele 0 when null), name in `Document/name`. XML-escape. Test: contains `<kml`, `<coordinates>`, correct `lon,lat,ele` order, escaped name.
- Commit `feat: add KML serializer`.

### B3: Convert format registry + wire screen
- `src/lib/domain/usecases/convert.ts` (pure): `EXPORT_FORMATS = ['gpx','tcx','kml'] as const`; `serializeAs(format, points, name): string` dispatching to gpx/tcx/kml serializers; `convertExt(format)`. FIT not in the list (import-only). Unit-test dispatch + that an unknown/`fit` throws a clear error.
- Wire `src/routes/(tabs)/tools/convert/+page.svelte`: remove the "Preview" banner + Soon pill (it becomes real); use `ActiveFileSelector` for the source file; From card shows the source extension; target chips GPX/TCX/KML (real), plus a **disabled** FIT chip with a small "import only" note; "Keep data" toggles are presentational for now (note: actual filtering optional — if cheap, drop sensors when "Sensor data" off via a points-map; otherwise leave the toggles visual and remove them to avoid fakeness — IMPLEMENTER: prefer making "Sensor data off" actually strip sensors, else remove the toggles). Button "Convert format" → `serializeAs(target, points, exportName(src,'',target))` → `FileService.exportAndShare`. Empty state when no file. Remove Convert's hub "Soon" pill.
- Commit `feat: wire Convert (GPX/TCX/KML export)`.

## Part C — Elevation fix (offline)

### C1: smoothing use-case (TDD)
- `src/lib/domain/usecases/smoothElevation.ts` → `smoothElevation(points, level: 'low'|'medium'|'high'): TrackPoint[]` — centered moving average over elevation with window by level (e.g. low 3, medium 7, high 15), skipping null elevations, non-mutating. `elevationFixLevelFromPercent(percent)` mapping if a slider is used. TDD: smooths a noisy series, preserves length, leaves nulls, window grows with level.
- Commit `feat: add elevation smoothing use-case`.

### C2: wire Elevation screen
- Wire `src/routes/(tabs)/tools/elevation/+page.svelte`: remove Preview banner + hub Soon pill; `ActiveFileSelector` source; compute before/after **gain** (`elevationGainMeters`) on real points using `repairElevation` then `smoothElevation(level)`; show real before (strikethrough) → after; before/after profile from real elevations (reuse the elevation-profile geometry helper). Source chips: **GPS** active; **SRTM/Mapbox disabled** with a "Soon" note. Smoothing slider/segmented → level. Button "Apply correction" → produce corrected points → `serializeGpx` → `exportAndShare(exportName(src,'elev'))`. Empty state when no file.
- Commit `feat: wire Elevation fix (offline repair + smoothing)`.

## Verification gate
- `npm run test:coverage` → pass + ≥90% (FIT reader/decoder, TrackImporter, TCX/KML, convert, smoothElevation all tested).
- `npm run check` 0/0; `npm run build` ok; `git status` clean.

## Self-review
- Spec §3 FIT seam (TrackImporter + FIT decoder) ✓; Convert multi-format ✓ (GPX/TCX/KML; FIT import-only — documented); Elevation real offline ✓ (SRTM/Mapbox deferred — documented).
- Testing rule: all new pure logic + parsers/serializers unit-tested with crafted fixtures; gate ≥90%. UI wired screens build+emulator-verified.
- Hub "Soon" pills removed for Convert + Elevation (now real); Compare keeps its pill (Phase 7).
- Type consistency: `parseFit`, `importTrack`, `serializeTcx/serializeKml/serializeAs`, `smoothElevation` signatures consistent across data/usecases/screens.
- Out of scope: FIT encoding, SRTM/Mapbox online elevation, Compare wiring (Phase 7), Web Worker (Phase 7).
