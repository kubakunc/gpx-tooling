import { describe, it, expect } from 'vitest';
import {
  formatKm,
  formatGain,
  formatDuration,
  formatBytes,
  formatCount,
  formatClock,
  exportName
} from './format';

describe('format helpers', () => {
  it('formatKm', () => {
    expect(formatKm(0)).toBe('0.0 km');
    expect(formatKm(24300)).toBe('24.3 km');
  });

  it('formatGain', () => {
    expect(formatGain(311.6)).toBe('+312 m');
    expect(formatGain(0)).toBe('+0 m');
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
});
