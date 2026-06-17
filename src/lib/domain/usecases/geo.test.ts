import { describe, it, expect } from 'vitest';
import { haversineMeters, perpendicularDistanceMeters } from './geo';

describe('haversineMeters', () => {
  it('is zero for identical points', () => {
    expect(haversineMeters(50, 19, 50, 19)).toBe(0);
  });
  it('approximates one degree of latitude as ~111 km', () => {
    const d = haversineMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });
});

describe('perpendicularDistanceMeters', () => {
  it('is zero when the point lies on the segment', () => {
    const d = perpendicularDistanceMeters(
      { lat: 0.5, lon: 0 }, { lat: 0, lon: 0 }, { lat: 1, lon: 0 }
    );
    expect(d).toBeLessThan(1);
  });
  it('measures offset from the segment in meters', () => {
    const d = perpendicularDistanceMeters(
      { lat: 0, lon: 0.001 }, { lat: -1, lon: 0 }, { lat: 1, lon: 0 }
    );
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
  it('falls back to point distance for a zero-length segment', () => {
    const d = perpendicularDistanceMeters(
      { lat: 0, lon: 0 }, { lat: 1, lon: 1 }, { lat: 1, lon: 1 }
    );
    expect(d).toBeGreaterThan(0);
  });
});
