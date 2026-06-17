import { describe, it, expect } from 'vitest';
import {
  EXPORT_FORMATS,
  isExportFormat,
  convertExt,
  stripSensors,
  serializeAs,
} from './convert';
import type { TrackPoint } from '../entities/TrackPoint';

const pt = (over: Partial<TrackPoint> = {}): TrackPoint => ({
  latitude: 45,
  longitude: 15,
  elevation: 100,
  time: new Date('2024-01-01T10:00:00.000Z'),
  sensors: { hr: 150 },
  ...over,
});

describe('convert', () => {
  it('exposes gpx/tcx/kml as export formats, not fit', () => {
    expect(EXPORT_FORMATS).toEqual(['gpx', 'tcx', 'kml']);
    expect(isExportFormat('gpx')).toBe(true);
    expect(isExportFormat('fit')).toBe(false);
    expect(isExportFormat('xyz')).toBe(false);
  });

  it('convertExt returns the format as the extension', () => {
    expect(convertExt('tcx')).toBe('tcx');
  });

  it('serializeAs dispatches to each serializer', () => {
    const pts = [pt(), pt()];
    expect(serializeAs('gpx', pts, 'r')).toContain('<gpx');
    expect(serializeAs('tcx', pts, 'r')).toContain('<TrainingCenterDatabase');
    expect(serializeAs('kml', pts, 'r')).toContain('<kml');
  });

  it('serializeAs throws a clear error for unknown / fit formats', () => {
    expect(() => serializeAs('fit', [pt()], 'r')).toThrow(/Unsupported export format/);
    expect(() => serializeAs('bogus', [pt()], 'r')).toThrow(/Unsupported export format/);
  });

  it('stripSensors clears all sensors without mutating input', () => {
    const pts = [pt({ sensors: { hr: 150, cadence: 80, power: 200 } })];
    const out = stripSensors(pts);
    expect(out[0].sensors).toEqual({});
    expect(pts[0].sensors.hr).toBe(150); // original untouched
    // a gpx serialized from stripped points has no extensions
    expect(serializeAs('gpx', out, 'r')).not.toContain('<extensions>');
  });
});
