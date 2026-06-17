import { describe, it, expect } from 'vitest';
import { parseFit } from './FitParser';
import {
  buildFitFixture,
  buildFitFixture14,
  buildFitFixtureWithDevData,
  buildFitFixtureWithExtras,
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
