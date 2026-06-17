/**
 * Test helper: build a valid little-endian FIT `Uint8Array` from scratch.
 *
 * Layout produced:
 *   - 12-byte header (".FIT" signature, correct dataSize)
 *   - one definition message for the `record` global message (num 20) with
 *     fields: timestamp(253,u32), lat(0,s32), long(1,s32), altitude(2,u16),
 *     heart_rate(3,u8), power(7,u16)
 *   - N data messages (one per input record)
 *   - dummy 2-byte CRC trailer
 *
 * Each record value may be `null` → encoded as the FIT invalid sentinel for
 * its base type, so the decoder's sentinel→null path can be exercised.
 */

export interface FitFixtureRecord {
  /** Raw FIT uint32 timestamp (seconds since FIT epoch) or null. */
  timestamp: number | null;
  /** Raw sint32 semicircles or null. */
  latSemicircles: number | null;
  /** Raw sint32 semicircles or null. */
  lonSemicircles: number | null;
  /** Raw uint16 altitude (metres = raw/5 - 500) or null. */
  altitudeRaw: number | null;
  /** Raw uint8 heart rate or null. */
  heartRate: number | null;
  /** Raw uint16 power or null. */
  power: number | null;
  /** Raw uint8 cadence or null (optional; only used by extended fixtures). */
  cadence?: number | null;
  /** Raw uint32 enhanced altitude or null (optional). */
  enhancedAltitudeRaw?: number | null;
}

const LOCAL_TYPE = 0;
const RECORD_GLOBAL_NUM = 20;

// Field definitions used by the fixture: [fieldDefNum, sizeBytes, baseType].
const FIELDS: ReadonlyArray<readonly [number, number, number]> = [
  [253, 4, 0x86], // timestamp uint32
  [0, 4, 0x85], // position_lat sint32
  [1, 4, 0x85], // position_long sint32
  [2, 2, 0x84], // altitude uint16
  [3, 1, 0x02], // heart_rate uint8
  [7, 2, 0x84], // power uint16
];

function pushU16LE(arr: number[], v: number): void {
  arr.push(v & 0xff, (v >> 8) & 0xff);
}

function pushU32LE(arr: number[], v: number): void {
  // >>> keeps it unsigned; works for negative sint32 two's complement too.
  const u = v >>> 0;
  arr.push(u & 0xff, (u >> 8) & 0xff, (u >> 16) & 0xff, (u >> 24) & 0xff);
}

function definitionRecord(): number[] {
  const out: number[] = [];
  out.push(0x40 | LOCAL_TYPE); // definition message header
  out.push(0x00); // reserved
  out.push(0x00); // architecture: 0 = little-endian
  pushU16LE(out, RECORD_GLOBAL_NUM);
  out.push(FIELDS.length);
  for (const [num, size, baseType] of FIELDS) out.push(num, size, baseType);
  return out;
}

function dataRecord(r: FitFixtureRecord): number[] {
  const out: number[] = [];
  out.push(LOCAL_TYPE); // normal data message header, localType 0
  pushU32LE(out, r.timestamp ?? 0xffffffff);
  pushU32LE(out, r.latSemicircles ?? 0x7fffffff);
  pushU32LE(out, r.lonSemicircles ?? 0x7fffffff);
  pushU16LE(out, r.altitudeRaw ?? 0xffff);
  out.push(r.heartRate ?? 0xff);
  pushU16LE(out, r.power ?? 0xffff);
  return out;
}

/** Build the FIT byte body (definition + data records), no header/CRC. */
function buildBody(records: FitFixtureRecord[]): number[] {
  const body = definitionRecord();
  for (const r of records) body.push(...dataRecord(r));
  return body;
}

/**
 * Build a complete, valid FIT file from the given records. The data size in
 * the header is computed to match the body exactly.
 */
export function buildFitFixture(records: FitFixtureRecord[]): Uint8Array {
  const body = buildBody(records);
  const header: number[] = [];
  header.push(12); // header size
  header.push(0x10); // protocol version
  pushU16LE(header, 0x0100); // profile version
  pushU32LE(header, body.length); // data size
  for (const c of '.FIT') header.push(c.charCodeAt(0));
  const crc = [0x00, 0x00]; // dummy CRC trailer
  return new Uint8Array([...header, ...body, ...crc]);
}

/**
 * Build a FIT file whose record definition declares one developer field
 * (1 byte) and one extra unknown-size field (3 bytes) after the standard
 * fields. Exercises the developer-data and unknown-field-size code paths.
 */
export function buildFitFixtureWithDevData(records: FitFixtureRecord[]): Uint8Array {
  const def: number[] = [];
  def.push(0x40 | 0x20 | LOCAL_TYPE); // definition + developer-data flag
  def.push(0x00); // reserved
  def.push(0x00); // little-endian
  pushU16LE(def, RECORD_GLOBAL_NUM);
  const extra: ReadonlyArray<readonly [number, number, number]> = [
    ...FIELDS,
    [200, 3, 0x0d], // unknown 3-byte field (byte array) → skipped
  ];
  def.push(extra.length);
  for (const [num, size, baseType] of extra) def.push(num, size, baseType);
  def.push(1); // numDevFields
  def.push(99, 1, 0); // devField: fieldNum, size, devDataIdx

  const body = [...def];
  for (const r of records) {
    const data = dataRecord(r);
    data.push(0x00, 0x00, 0x00); // 3 bytes for the unknown field
    data.push(0x00); // 1 byte for the dev field
    body.push(...data);
  }

  const header: number[] = [12, 0x10];
  pushU16LE(header, 0x0100);
  pushU32LE(header, body.length);
  for (const c of '.FIT') header.push(c.charCodeAt(0));
  return new Uint8Array([...header, ...body, 0x00, 0x00]);
}

/**
 * Build a fixture whose record definition additionally carries cadence (4) and
 * enhanced_altitude (78), so the decoder's cadence + enhanced-altitude paths
 * are exercised. enhanced_altitude takes precedence over altitude.
 */
export function buildFitFixtureWithExtras(records: FitFixtureRecord[]): Uint8Array {
  const fields: ReadonlyArray<readonly [number, number, number]> = [
    [253, 4, 0x86],
    [0, 4, 0x85],
    [1, 4, 0x85],
    [2, 2, 0x84],
    [78, 4, 0x86], // enhanced_altitude uint32
    [3, 1, 0x02],
    [4, 1, 0x02], // cadence uint8
    [7, 2, 0x84],
  ];
  const def: number[] = [0x40 | LOCAL_TYPE, 0x00, 0x00];
  pushU16LE(def, RECORD_GLOBAL_NUM);
  def.push(fields.length);
  for (const [num, size, baseType] of fields) def.push(num, size, baseType);

  const body = [...def];
  for (const r of records) {
    const d: number[] = [LOCAL_TYPE];
    pushU32LE(d, r.timestamp ?? 0xffffffff);
    pushU32LE(d, r.latSemicircles ?? 0x7fffffff);
    pushU32LE(d, r.lonSemicircles ?? 0x7fffffff);
    pushU16LE(d, r.altitudeRaw ?? 0xffff);
    pushU32LE(d, r.enhancedAltitudeRaw ?? 0xffffffff);
    d.push(r.heartRate ?? 0xff);
    d.push(r.cadence ?? 0xff);
    pushU16LE(d, r.power ?? 0xffff);
    body.push(...d);
  }

  const header: number[] = [12, 0x10];
  pushU16LE(header, 0x0100);
  pushU32LE(header, body.length);
  for (const c of '.FIT') header.push(c.charCodeAt(0));
  return new Uint8Array([...header, ...body, 0x00, 0x00]);
}

/** Build a buffer with a 14-byte header (adds a 2-byte header CRC). */
export function buildFitFixture14(records: FitFixtureRecord[]): Uint8Array {
  const body = buildBody(records);
  const header: number[] = [];
  header.push(14); // header size
  header.push(0x10);
  pushU16LE(header, 0x0100);
  pushU32LE(header, body.length);
  for (const c of '.FIT') header.push(c.charCodeAt(0));
  header.push(0x00, 0x00); // header CRC (ignored by lenient decoder)
  return new Uint8Array([...header, ...body, 0x00, 0x00]);
}
