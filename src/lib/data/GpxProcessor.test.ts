// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { GpxProcessor } from './GpxProcessor';

const gpx = (lat: number, t: string) =>
  `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg><trkpt lat="${lat}" lon="0"><time>${t}</time></trkpt></trkseg></trk></gpx>`;

describe('GpxProcessor', () => {
  const proc = new GpxProcessor();
  it('parses then serializes (round-trip through the facade)', () => {
    const file = proc.parse(gpx(49.1, '2026-01-01T00:00:00Z'), 'a.gpx');
    const xml = proc.serialize(file.points, 'out');
    expect(proc.parse(xml, 'out').points[0].latitude).toBe(49.1);
  });
  it('merges files chronologically (smart by default) into a flat GpxFile', () => {
    const a = proc.parse(gpx(1, '2026-01-01T00:02:00Z'), 'a.gpx');
    const b = proc.parse(gpx(2, '2026-01-01T00:01:00Z'), 'b.gpx');
    const merged = proc.merge([a, b]);
    // Smart mode orders files by start time: b (00:01) before a (00:02).
    expect(merged.points.map((p) => p.latitude)).toEqual([2, 1]);
    expect(merged.name).toBe('merged');
  });
  it('merges in sequential mode preserving file order', () => {
    const a = proc.parse(gpx(1, '2026-01-01T00:02:00Z'), 'a.gpx');
    const b = proc.parse(gpx(2, '2026-01-01T00:01:00Z'), 'b.gpx');
    const merged = proc.merge([a, b], { mode: 'sequential' });
    expect(merged.points.map((p) => p.latitude)).toEqual([1, 2]);
  });
  it('exposes trim, simplify and repair over points', () => {
    const file = proc.parse(gpx(0, '2026-01-01T00:00:00Z'), 'a.gpx');
    expect(proc.trim(file.points, 0, 1).length).toBeGreaterThan(0);
    expect(Array.isArray(proc.simplify(file.points, 10))).toBe(true);
    expect(Array.isArray(proc.repairElevation(file.points))).toBe(true);
  });
});
