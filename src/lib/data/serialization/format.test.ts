import { describe, it, expect } from 'vitest';
import { formatCoord, formatNum } from './format';

describe('formatCoord', () => {
  it('never emits exponential notation for tiny magnitudes', () => {
    expect(formatCoord(0.0000005)).toBe('0.0000005');
    expect(formatCoord(0.0000005)).not.toMatch(/e/i);
    expect(formatCoord(5e-7)).toBe('0.0000005');
  });

  it('renders whole degrees without a decimal point', () => {
    expect(formatCoord(45)).toBe('45');
    expect(formatCoord(0)).toBe('0');
  });

  it('keeps sign and strips trailing zeros', () => {
    expect(formatCoord(-15.5)).toBe('-15.5');
    expect(formatCoord(49.1)).toBe('49.1');
  });

  it('clamps to 7 fractional digits (~1 cm)', () => {
    expect(formatCoord(45.123456789)).toBe('45.1234568');
  });

  it('handles non-finite input', () => {
    expect(formatCoord(NaN)).toBe('0');
    expect(formatCoord(Infinity)).toBe('0');
  });
});

describe('formatNum', () => {
  it('renders integers plainly', () => {
    expect(formatNum(100)).toBe('100');
    expect(formatNum(-3)).toBe('-3');
    expect(formatNum(0)).toBe('0');
  });

  it('renders decimals without exponential notation', () => {
    expect(formatNum(12.34)).toBe('12.34');
    expect(formatNum(5e-7)).toBe('0.0000005');
    expect(formatNum(5e-7)).not.toMatch(/e/i);
  });

  it('handles non-finite input', () => {
    expect(formatNum(NaN)).toBe('0');
  });
});
