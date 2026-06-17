import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs only the last call within the window', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(1);
    d(2);
    d(3);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('runs again for a call after the window elapsed', () => {
    const fn = vi.fn();
    const d = debounce(fn, 50);
    d('a');
    vi.advanceTimersByTime(50);
    d('b');
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'a');
    expect(fn).toHaveBeenNthCalledWith(2, 'b');
  });

  it('cancel prevents a pending call', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d('x');
    d.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel is safe when nothing is pending', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    expect(() => d.cancel()).not.toThrow();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });
});
