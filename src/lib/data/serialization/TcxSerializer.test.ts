import { describe, it, expect } from 'vitest';
import { serializeTcx } from './TcxSerializer';
import type { TrackPoint } from '../../domain/entities/TrackPoint';

const pt = (over: Partial<TrackPoint> = {}): TrackPoint => ({
  latitude: 45,
  longitude: 15,
  elevation: 100,
  time: new Date('2024-01-01T10:00:00.000Z'),
  sensors: {},
  ...over,
});

describe('serializeTcx', () => {
  it('emits a TCX skeleton with a Biking activity', () => {
    const xml = serializeTcx([pt()], 'ride');
    expect(xml).toContain('<TrainingCenterDatabase');
    expect(xml).toContain('<Activity Sport="Biking">');
    expect(xml).toContain('<Track>');
    expect(xml).toContain('<LatitudeDegrees>45</LatitudeDegrees>');
    expect(xml).toContain('<LongitudeDegrees>15</LongitudeDegrees>');
    expect(xml).toContain('<AltitudeMeters>100</AltitudeMeters>');
    expect(xml).toContain('<Time>2024-01-01T10:00:00.000Z</Time>');
  });

  it('uses the first timestamp as the activity Id', () => {
    const xml = serializeTcx([pt()], 'ride');
    expect(xml).toContain('<Id>2024-01-01T10:00:00.000Z</Id>');
  });

  it('falls back to a synthetic epoch dateTime Id when there are no timestamps', () => {
    // TCX Id is xsd:dateTime, so a filename is invalid here.
    const xml = serializeTcx([pt({ time: null })], 'a & b');
    expect(xml).toContain('<Id>1970-01-01T00:00:00.000Z</Id>');
    expect(xml).not.toContain('a &amp; b');
  });

  it('writes one Trackpoint per point', () => {
    const xml = serializeTcx([pt(), pt(), pt()], 'ride');
    expect(xml.match(/<Trackpoint>/g)).toHaveLength(3);
  });

  it('emits sensors only when present', () => {
    const xml = serializeTcx([pt({ sensors: { hr: 150, cadence: 88, power: 240 } })], 'ride');
    expect(xml).toContain('<HeartRateBpm>');
    expect(xml).toContain('<Value>150</Value>');
    expect(xml).toContain('<Cadence>88</Cadence>');
    expect(xml).toContain('<Watts>240</Watts>');

    const bare = serializeTcx([pt({ sensors: {} })], 'ride');
    expect(bare).not.toContain('<HeartRateBpm>');
    expect(bare).not.toContain('<Cadence>');
    expect(bare).not.toContain('<Watts>');
  });

  it('omits elevation and time when null', () => {
    const xml = serializeTcx([pt({ elevation: null, time: null })], 'ride');
    expect(xml).not.toContain('<AltitudeMeters>');
    expect(xml).not.toContain('<Time>');
  });
});
