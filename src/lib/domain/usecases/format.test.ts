import { describe, it, expect } from 'vitest';
import { formatKm, formatGain, formatDuration, formatBytes, formatCount } from './format';

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
});
