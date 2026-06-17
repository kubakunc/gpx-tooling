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
  it('throws ParseError when a trackpoint is missing lat/lon', () => {
    const xml = '<?xml version="1.0"?><gpx><trk><trkseg><trkpt lon="0"></trkpt></trkseg></trk></gpx>';
    expect(() => parseGpx(xml, 'x.gpx')).toThrow(ParseError);
  });
  it('treats an unparseable time as null', () => {
    const xml = '<?xml version="1.0"?><gpx><trk><trkseg><trkpt lat="1" lon="0"><time>not-a-date</time></trkpt></trkseg></trk></gpx>';
    const f = parseGpx(xml, 'x.gpx');
    expect(f.points[0].time).toBeNull();
  });
});
