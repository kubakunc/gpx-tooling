import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { toasts, showToast, dismissToast, __resetToasts } from './toast';

describe('toast store', () => {
  beforeEach(() => {
    __resetToasts();
  });

  it('showToast appends a toast with an incrementing id and kind', () => {
    showToast('first', 'success', { autoDismiss: false });
    showToast('second', 'error', { autoDismiss: false });
    const list = get(toasts);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ message: 'first', kind: 'success' });
    expect(list[1]).toMatchObject({ message: 'second', kind: 'error' });
    expect(list[1].id).toBeGreaterThan(list[0].id);
  });

  it('defaults kind to info', () => {
    showToast('hello', undefined, { autoDismiss: false });
    expect(get(toasts)[0].kind).toBe('info');
  });

  it('dismissToast removes the toast with the given id', () => {
    showToast('a', 'info', { autoDismiss: false });
    showToast('b', 'info', { autoDismiss: false });
    const [first] = get(toasts);
    dismissToast(first.id);
    const list = get(toasts);
    expect(list).toHaveLength(1);
    expect(list[0].message).toBe('b');
  });

  it('auto-dismisses after the timeout using the injected timer', () => {
    vi.useFakeTimers();
    try {
      showToast('temp', 'success');
      expect(get(toasts)).toHaveLength(1);
      vi.advanceTimersByTime(3500);
      expect(get(toasts)).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns the created toast id', () => {
    const id = showToast('x', 'info', { autoDismiss: false });
    expect(get(toasts)[0].id).toBe(id);
  });
});
