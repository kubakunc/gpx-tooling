import { describe, it, expect } from 'vitest';
import {
  formatDistance,
  formatElevation,
  formatGain,
  formatDuration,
  formatBytes,
  formatCount,
  formatClock,
  formatSpeed,
  exportName
} from './format';

describe('format helpers', () => {
  it('formatDistance metric', () => {
    expect(formatDistance(0, 'metric')).toBe('0.0 km');
    expect(formatDistance(24300, 'metric')).toBe('24.3 km');
    expect(formatDistance(12300, 'metric')).toBe('12.3 km');
  });

  it('formatDistance imperial (m / 1609.344)', () => {
    expect(formatDistance(0, 'imperial')).toBe('0.0 mi');
    // 12300 m / 1609.344 = 7.643… → 7.6 mi
    expect(formatDistance(12300, 'imperial')).toBe('7.6 mi');
    expect(formatDistance(1609.344, 'imperial')).toBe('1.0 mi');
  });

  it('formatElevation metric', () => {
    expect(formatElevation(0, 'metric')).toBe('0 m');
    expect(formatElevation(311.6, 'metric')).toBe('312 m');
  });

  it('formatElevation imperial (m * 3.28084)', () => {
    expect(formatElevation(0, 'imperial')).toBe('0 ft');
    // 312.1 m * 3.28084 = 1024.0… → 1024 ft
    expect(formatElevation(312.1, 'imperial')).toBe('1024 ft');
  });

  it('formatGain metric', () => {
    expect(formatGain(311.6, 'metric')).toBe('+312 m');
    expect(formatGain(0, 'metric')).toBe('+0 m');
  });

  it('formatGain imperial (m * 3.28084)', () => {
    expect(formatGain(0, 'imperial')).toBe('+0 ft');
    // 312.1 m * 3.28084 ≈ 1024 ft
    expect(formatGain(312.1, 'imperial')).toBe('+1024 ft');
  });

  it('formatDuration under and over an hour', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(95)).toBe('1:35');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(-10)).toBe('0:00');
  });

  it('formatBytes across magnitudes', () => {
    expect(formatBytes(840)).toBe('840 B');
    expect(formatBytes(12595)).toBe('12.3 KB');
    expect(formatBytes(1887436)).toBe('1.8 MB');
  });

  it('formatCount groups thousands', () => {
    expect(formatCount(8412)).toBe('8 412');
    expect(formatCount(240)).toBe('240');
    expect(formatCount(1000000)).toBe('1 000 000');
  });

  it('formatClock returns local HH:MM, or "no time" when null', () => {
    // Local-time string (no Z) so the rendered HH:MM is timezone-independent.
    expect(formatClock(new Date('2026-01-01T08:05:00').getTime())).toBe('08:05');
    expect(formatClock(new Date('2026-01-01T23:09:00').getTime())).toBe('23:09');
    expect(formatClock(null)).toBe('no time');
  });

  it('exportName strips source ext and appends suffix', () => {
    expect(exportName('morning.gpx', 'trimmed')).toBe('morning-trimmed.gpx');
    expect(exportName('ride.track.GPX', 'reduced')).toBe('ride.track-reduced.gpx');
    expect(exportName('noext', 'merged')).toBe('noext-merged.gpx');
  });

  it('exportName falls back to suffix when source is empty', () => {
    expect(exportName('', 'merged')).toBe('merged.gpx');
    expect(exportName('   ', 'merged')).toBe('merged.gpx');
    expect(exportName('.gpx', 'merged')).toBe('merged.gpx');
  });

  it('exportName honors a custom extension', () => {
    expect(exportName('track.gpx', 'converted', 'kml')).toBe('track-converted.kml');
  });

  it('exportName strips fit/tcx/kml source extensions too', () => {
    expect(exportName('ride.fit', 'elev')).toBe('ride-elev.gpx');
    expect(exportName('ride.TCX', 'x', 'kml')).toBe('ride-x.kml');
  });

  it('exportName supports an empty suffix (format conversion)', () => {
    expect(exportName('ride.gpx', '', 'tcx')).toBe('ride.tcx');
    expect(exportName('', '', 'kml')).toBe('track.kml');
  });

  it('formatSpeed metric renders km/h to one decimal, or "—" when null', () => {
    expect(formatSpeed(15.64, 'metric')).toBe('15.6 km/h');
    expect(formatSpeed(0, 'metric')).toBe('0.0 km/h');
    expect(formatSpeed(null, 'metric')).toBe('—');
  });

  it('formatSpeed imperial renders mph (kmh / 1.609344), or "—" when null', () => {
    // 15.64 / 1.609344 = 9.717… → 9.7 mph
    expect(formatSpeed(15.64, 'imperial')).toBe('9.7 mph');
    expect(formatSpeed(0, 'imperial')).toBe('0.0 mph');
    expect(formatSpeed(null, 'imperial')).toBe('—');
  });
});
