import { describe, it, expect } from 'vitest';
import { simplifyRdp } from './simplify';
import type { TrackPoint } from '../entities/TrackPoint';

const tp = (lat: number, lon: number): TrackPoint => ({ latitude: lat, longitude: lon, elevation: null, time: null, sensors: {} });

describe('simplifyRdp', () => {
  it('returns input unchanged when it has <=2 points', () => {
    expect(simplifyRdp([tp(0, 0)], 10)).toHaveLength(1);
    expect(simplifyRdp([tp(0, 0), tp(1, 1)], 10)).toHaveLength(2);
  });
  it('drops near-collinear middle points under epsilon', () => {
    const line = [tp(0, 0), tp(0, 0.5), tp(0, 1)]; // middle is on the line
    expect(simplifyRdp(line, 10)).toHaveLength(2);
  });
  it('keeps a middle point whose deviation exceeds epsilon', () => {
    const bent = [tp(0, 0), tp(0.01, 0.5), tp(0, 1)]; // ~1.1km deviation
    expect(simplifyRdp(bent, 10)).toHaveLength(3);
  });
  it('always keeps first and last', () => {
    const r = simplifyRdp([tp(0, 0), tp(0, 0.5), tp(0, 1)], 1e9);
    expect(r[0]).toEqual(tp(0, 0));
    expect(r[r.length - 1]).toEqual(tp(0, 1));
  });
});
