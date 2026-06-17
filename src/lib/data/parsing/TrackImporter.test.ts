// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { importTrack } from './TrackImporter';
import { ParseError } from '../../domain/errors';
import { buildFitFixture, type FitFixtureRecord } from './fit/buildFitFixture';

const GPX =
  `<?xml version="1.0"?><gpx version="1.1" creator="t"><trk><trkseg>` +
  `<trkpt lat="49.0" lon="19.0"><ele>100</ele></trkpt>` +
  `<trkpt lat="49.1" lon="19.1"><ele>110</ele></trkpt>` +
  `</trkseg></trk></gpx>`;

const REC: FitFixtureRecord = {
  timestamp: 1000,
  latSemicircles: Math.round((45 / 180) * 2 ** 31),
  lonSemicircles: Math.round((15 / 180) * 2 ** 31),
  altitudeRaw: (1200 + 500) * 5,
  heartRate: 150,
  power: 240,
};

describe('importTrack', () => {
  it('parses GPX text by .gpx extension', () => {
    const file = importTrack('ride.gpx', { text: GPX });
    expect(file.name).toBe('ride.gpx');
    expect(file.points).toHaveLength(2);
  });

  it('parses FIT bytes by .fit extension', () => {
    const bytes = buildFitFixture([REC]);
    const file = importTrack('ride.fit', { bytes });
    expect(file.points).toHaveLength(1);
    expect(file.points[0].latitude).toBeCloseTo(45, 4);
  });

  it('sniffs FIT magic bytes for an unknown extension', () => {
    const bytes = buildFitFixture([REC]);
    const file = importTrack('mystery.dat', { bytes });
    expect(file.points).toHaveLength(1);
  });

  it('falls back to GPX text for an unknown extension', () => {
    const file = importTrack('mystery', { text: GPX });
    expect(file.points).toHaveLength(2);
  });

  it('throws ParseError when .fit has no bytes', () => {
    expect(() => importTrack('r.fit', { text: 'x' })).toThrow(ParseError);
  });

  it('throws ParseError when .gpx has no text', () => {
    expect(() => importTrack('r.gpx', { bytes: new Uint8Array() })).toThrow(ParseError);
  });

  it('throws ParseError on unknown empty content', () => {
    expect(() => importTrack('weird', {})).toThrow(ParseError);
    expect(() => importTrack('weird', { text: '   ' })).toThrow(ParseError);
  });
});
