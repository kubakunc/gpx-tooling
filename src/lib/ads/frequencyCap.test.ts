import { describe, it, expect } from 'vitest';
import { canShow, DEFAULT_CAP_MS } from './frequencyCap';

describe('canShow frequency cap', () => {
  it('returns true when never shown (null)', () => {
    expect(canShow(null, 0)).toBe(true);
    expect(canShow(null, 1_000_000)).toBe(true);
  });

  it('returns false when within the cap window', () => {
    expect(canShow(1000, 1000 + DEFAULT_CAP_MS - 1)).toBe(false);
    expect(canShow(1000, 1000)).toBe(false);
  });

  it('returns true exactly at the cap boundary', () => {
    expect(canShow(1000, 1000 + DEFAULT_CAP_MS)).toBe(true);
  });

  it('returns true after the cap window', () => {
    expect(canShow(1000, 1000 + DEFAULT_CAP_MS + 1)).toBe(true);
  });

  it('honours a custom cap', () => {
    expect(canShow(0, 500, 1000)).toBe(false);
    expect(canShow(0, 1000, 1000)).toBe(true);
  });

  it('defaults the cap to three minutes', () => {
    expect(DEFAULT_CAP_MS).toBe(180_000);
  });
});
