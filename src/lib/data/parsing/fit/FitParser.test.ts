import { describe, it, expect } from 'vitest';
import { parseFit } from './FitParser';
import {
  buildFitFixture,
  buildFitFixture14,
  buildFitFixtureWithDevData,
  buildFitFixtureWithExtras,
  buildFitFixtureCompressedTimestamp,
  type FitFixtureRecord,
} from './buildFitFixture';
import { ParseError } from '../../../domain/errors';

// 45° latitude in semicircles: 45 / (180 / 2^31) = 2^31 / 4.
const LAT_45 = Math.round((45 / 180) * 2 ** 31);
const LON_15 = Math.round((15 / 180) * 2 ** 31);
const TS = 1000; // raw FIT seconds

const REC: FitFixtureRecord = {
  timestamp: TS,
  latSemicircles: LAT_45,
  lonSemicircles: LON_15,
  altitudeRaw: (1200 + 500) * 5, // 1200 m → raw 8500
  heartRate: 150,
  power: 240,
};

describe('parseFit', () => {
  it('decodes lat/lon/altitude/time/sensors from a crafted FIT buffer', () => {
    const bytes = buildFitFixture([REC, { ...REC, timestamp: TS + 1 }]);
    const file = parseFit(bytes, 'ride.fit');
    expect(file.name).toBe('ride.fit');
    expect(file.points).toHaveLength(2);

    const p = file.points[0];
    expect(p.latitude).toBeCloseTo(45, 4);
    expect(p.longitude).toBeCloseTo(15, 4);
    expect(p.elevation).toBeCloseTo(1200, 6);
    // FIT epoch 1989-12-31; raw 1000 s after that.
    expect(p.time?.getTime()).toBe((TS + 631065600) * 1000);
    expect(p.sensors.hr).toBe(150);
    expect(p.sensors.power).toBe(240);
  });

  it('maps invalid sentinels to null (altitude/time) and drops absent sensors', () => {
    const bytes = buildFitFixture([
      { ...REC, altitudeRaw: null, timestamp: null, heartRate: null, power: null },
    ]);
    const p = parseFit(bytes, 'r.fit').points[0];
    expect(p.elevation).toBeNull();
    expect(p.time).toBeNull();
    expect(p.sensors.hr).toBeUndefined();
    expect(p.sensors.power).toBeUndefined();
    // position still present
    expect(p.latitude).toBeCloseTo(45, 4);
  });

  it('drops records that have no valid position', () => {
    const bytes = buildFitFixture([{ ...REC, latSemicircles: null }, REC]);
    const file = parseFit(bytes, 'r.fit');
    // Only the second record (with a position) survives.
    expect(file.points).toHaveLength(1);
  });

  it('prefers enhanced_altitude over altitude and decodes cadence', () => {
    const bytes = buildFitFixtureWithExtras([
      { ...REC, altitudeRaw: (100 + 500) * 5, enhancedAltitudeRaw: (1500 + 500) * 5, cadence: 88 },
    ]);
    const p = parseFit(bytes, 'r.fit').points[0];
    expect(p.elevation).toBeCloseTo(1500, 6); // enhanced wins over 100 m
    expect(p.sensors.cadence).toBe(88);
  });

  it('handles negative semicircles (southern/western hemisphere)', () => {
    const bytes = buildFitFixture([{ ...REC, latSemicircles: -LAT_45, lonSemicircles: -LON_15 }]);
    const p = parseFit(bytes, 'r.fit').points[0];
    expect(p.latitude).toBeCloseTo(-45, 4);
    expect(p.longitude).toBeCloseTo(-15, 4);
  });

  it('accepts a 14-byte header (with header CRC)', () => {
    const bytes = buildFitFixture14([REC]);
    expect(parseFit(bytes, 'r.fit').points).toHaveLength(1);
  });

  it('skips developer fields and unknown-size fields, still decoding records', () => {
    const bytes = buildFitFixtureWithDevData([REC, { ...REC, timestamp: TS + 1 }]);
    const file = parseFit(bytes, 'dev.fit');
    expect(file.points).toHaveLength(2);
    expect(file.points[0].latitude).toBeCloseTo(45, 4);
    expect(file.points[0].sensors.hr).toBe(150);
  });

  it('throws ParseError on a non-".FIT" signature', () => {
    const bytes = buildFitFixture([REC]);
    bytes[8] = 0x58; // corrupt the "." of ".FIT"
    expect(() => parseFit(bytes, 'bad.fit')).toThrow(ParseError);
  });

  it('throws ParseError when too short to be FIT', () => {
    expect(() => parseFit(new Uint8Array([1, 2, 3]), 'tiny.fit')).toThrow(ParseError);
  });

  it('decodes a compressed-timestamp data message (high bit set)', () => {
    // Build normal fixture, then flip the data-record header for localType 0
    // to a compressed-timestamp header: 0x80 | (localType<<5) | timeOffset.
    const bytes = buildFitFixture([REC]);
    // header(12) + definition: hdr(1)+reserved(1)+arch(1)+global(2)+numFields(1)+6*3
    const defLen = 1 + 1 + 1 + 2 + 1 + 6 * 3;
    const dataHeaderPos = 12 + defLen;
    bytes[dataHeaderPos] = 0x80; // compressed-timestamp, localType 0, offset 0
    const p = parseFit(bytes, 'r.fit').points[0];
    expect(p.latitude).toBeCloseTo(45, 4);
  });

  it('applies a compressed-timestamp offset relative to the last full timestamp', () => {
    // First record carries a full timestamp (field 253). The second record is
    // a compressed-timestamp record (no 253 field) whose 5-bit offset should
    // resolve against the first record's timestamp.
    const base = 0x100; // low 5 bits = 0
    const offset = 5;
    const bytes = buildFitFixtureCompressedTimestamp(
      { ...REC, timestamp: base, latSemicircles: LAT_45, lonSemicircles: LON_15 },
      offset
    );
    const file = parseFit(bytes, 'ct.fit');
    expect(file.points).toHaveLength(2);
    // First point: full timestamp.
    expect(file.points[0].time?.getTime()).toBe((base + 631065600) * 1000);
    // Second point: base low-5 replaced by offset → base + 5.
    expect(file.points[1].time?.getTime()).toBe((base + offset + 631065600) * 1000);
  });

  it('rolls a compressed-timestamp offset over 32 s when it wraps', () => {
    // previous low-5 = 10, offset = 3 (< 10) → +0x20 rollover.
    const base = 10; // low 5 bits = 10
    const offset = 3;
    const bytes = buildFitFixtureCompressedTimestamp({ ...REC, timestamp: base }, offset);
    const file = parseFit(bytes, 'ct.fit');
    // base(10) high bits 0 → next = 0 + 3 + 0x20 = 0x23 = 35
    expect(file.points[1].time?.getTime()).toBe((0x20 + offset + 631065600) * 1000);
  });

  it('skips a compressed-timestamp record referencing an undefined local type', () => {
    // Two normal records, then flip the SECOND data header into a
    // compressed-timestamp header for localType 1 (only localType 0 defined).
    // The decoder must skip it gracefully (no hard ParseError for "before
    // definition") — the first real record still decodes.
    const defLen = 1 + 1 + 1 + 2 + 1 + 6 * 3;
    const dataLen = 1 + 4 + 4 + 4 + 2 + 1 + 2; // localType data record length
    const secondDataPos = 12 + defLen + dataLen;
    const two = buildFitFixture([REC, REC]);
    two[secondDataPos] = 0x80 | (1 << 5); // compressed-ts header, localType 1
    const file = parseFit(two, 'ct.fit');
    expect(file.points.length).toBeGreaterThanOrEqual(1);
    expect(file.points[0].latitude).toBeCloseTo(45, 4);
  });

  describe('robustness on malformed/truncated input (throws ParseError, never RangeError)', () => {
    it('throws ParseError on a truncated buffer (valid fixture sliced short)', () => {
      const full = buildFitFixture([REC, { ...REC, timestamp: TS + 1 }]);
      // Cut into the middle of the data records so a field read runs past end.
      const truncated = full.slice(0, full.length - 6);
      let thrown: unknown;
      try {
        parseFit(truncated, 'trunc.fit');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(ParseError);
      expect(() => parseFit(truncated, 'trunc.fit')).toThrow(ParseError);
    });

    it('throws ParseError when the header dataSize is larger than the buffer', () => {
      const bytes = buildFitFixture([REC]);
      // dataSize lives at header offset 4..7 (uint32 LE). Make it huge.
      bytes[4] = 0xff;
      bytes[5] = 0xff;
      bytes[6] = 0xff;
      bytes[7] = 0x7f;
      let thrown: unknown;
      try {
        parseFit(bytes, 'biglie.fit');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(ParseError);
      expect(thrown).not.toBeInstanceOf(RangeError);
    });

    it('throws ParseError on a definition declaring an oversized field', () => {
      // Build a buffer: valid 12-byte header + a definition whose single field
      // claims a 4-byte size but no data follows, then a data header.
      const header: number[] = [12, 0x10, 0x00, 0x01];
      // dataSize: definition(8) + data header(1) = 9 — but field over-reads.
      const def = [0x40, 0x00, 0x00, 20, 0x00, 1, 0, 4, 0x85]; // 1 field, size 4
      const dataHdr = [0x00]; // data record header, then nothing to read
      const dataSize = def.length + dataHdr.length;
      header.push(dataSize & 0xff, (dataSize >> 8) & 0xff, 0, 0);
      for (const c of '.FIT') header.push(c.charCodeAt(0));
      const bytes = new Uint8Array([...header, ...def, ...dataHdr]);
      let thrown: unknown;
      try {
        parseFit(bytes, 'oversize.fit');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(ParseError);
      expect(thrown).not.toBeInstanceOf(RangeError);
    });

    it('fuzz: deterministic pseudo-random bodies always throw ParseError, never a non-ParseError', () => {
      // Simple LCG for determinism (no Math.random).
      let seed = 0x1234abcd;
      const next = (): number => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed;
      };
      for (let iter = 0; iter < 200; iter++) {
        const len = 12 + (next() % 64);
        const body = new Uint8Array(len);
        for (let i = 0; i < len; i++) body[i] = next() & 0xff;
        // Plant a valid ".FIT" magic so we exercise the record decoder, not the
        // early signature reject.
        body[0] = 12; // header size
        body[8] = 0x2e;
        body[9] = 0x46;
        body[10] = 0x49;
        body[11] = 0x54; // ".FIT"
        try {
          parseFit(body, `fuzz-${iter}.fit`);
          // If it didn't throw, that's fine (it produced a valid file).
        } catch (e) {
          expect(e).toBeInstanceOf(ParseError);
        }
      }
    });
  });

  it('throws ParseError on a data record before any definition', () => {
    // Hand-craft: valid header but the first record byte is a data header.
    const header = [12, 0x10, 0x00, 0x01, 0x02, 0x00, 0x00, 0x00];
    for (const c of '.FIT') header.push(c.charCodeAt(0));
    const bytes = new Uint8Array([...header, 0x00, 0xff, 0xff]); // data hdr localType 0
    expect(() => parseFit(bytes, 'orphan.fit')).toThrow(ParseError);
  });

  it('throws ParseError when no record messages are present', () => {
    // A definition-only file (empty record set): build then trim the data
    // records by lying about dataSize via a hand-built buffer.
    const full = buildFitFixture([REC]);
    // header(12) + definition(2 + ... ) — recompute: definition record length.
    // definition = 5 (hdr+reserved+arch+global2) ... easier: rebuild with zero records.
    const defOnly = buildFitFixture([]);
    // buildFitFixture([]) yields a definition with no data → no records.
    expect(() => parseFit(defOnly, 'empty.fit')).toThrow(ParseError);
    // sanity: the full file does decode
    expect(parseFit(full, 'ok.fit').points).toHaveLength(1);
  });
});
