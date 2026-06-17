import { describe, it, expect } from 'vitest';
import { serializeKml } from './KmlSerializer';
import type { TrackPoint } from '../../domain/entities/TrackPoint';

const pt = (over: Partial<TrackPoint> = {}): TrackPoint => ({
  latitude: 45,
  longitude: 15,
  elevation: 100,
  time: null,
  sensors: {},
  ...over,
});

describe('serializeKml', () => {
  it('emits a KML 2.2 Document with a LineString', () => {
    const xml = serializeKml([pt(), pt({ latitude: 46, longitude: 16, elevation: 110 })], 'ride');
    expect(xml).toContain('<kml');
    expect(xml).toContain('http://www.opengis.net/kml/2.2');
    expect(xml).toContain('<coordinates>');
    expect(xml).toContain('<LineString>');
  });

  it('writes coordinates in lon,lat,ele order, space-separated', () => {
    const xml = serializeKml([pt(), pt({ latitude: 46, longitude: 16, elevation: 110 })], 'ride');
    expect(xml).toContain('<coordinates>15,45,100 16,46,110</coordinates>');
  });

  it('writes 0 for missing elevation', () => {
    const xml = serializeKml([pt({ elevation: null })], 'ride');
    expect(xml).toContain('<coordinates>15,45,0</coordinates>');
  });

  it('escapes the document/placemark name', () => {
    const xml = serializeKml([pt()], 'a & <b>');
    expect(xml).toContain('<name>a &amp; &lt;b&gt;</name>');
    expect(xml).not.toContain('<b>');
  });
});
