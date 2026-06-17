import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  editSession,
  setFileId,
  setStartRatio,
  setEndRatio,
  setEpsilon,
  resetEditSession,
  DEFAULT_EDIT_SESSION
} from './editSession';

describe('editSession store', () => {
  beforeEach(() => resetEditSession());

  it('has sensible defaults', () => {
    expect(get(editSession)).toEqual({ fileId: null, startRatio: 0, endRatio: 1, epsilon: 10 });
    expect(DEFAULT_EDIT_SESSION.epsilon).toBe(10);
  });

  it('setFileId updates the selected file', () => {
    setFileId('f1-x');
    expect(get(editSession).fileId).toBe('f1-x');
    setFileId(null);
    expect(get(editSession).fileId).toBeNull();
  });

  it('setStartRatio clamps to [0,1] and keeps start < end', () => {
    setStartRatio(-1);
    expect(get(editSession).startRatio).toBe(0);
    setStartRatio(2);
    // cannot exceed end (1); clamps just below end
    expect(get(editSession).startRatio).toBeLessThan(get(editSession).endRatio);
  });

  it('setEndRatio clamps to [0,1] and keeps end > start', () => {
    setStartRatio(0.4);
    setEndRatio(0.2);
    expect(get(editSession).endRatio).toBeGreaterThan(get(editSession).startRatio);
    setEndRatio(5);
    expect(get(editSession).endRatio).toBe(1);
  });

  it('keeps start < end across interleaved setter calls', () => {
    // setEnd near 0 then setStart: each setter must preserve the invariant by
    // nudging the *other* bound when the gap can no longer fit.
    setEndRatio(0);
    let s = get(editSession);
    expect(s.startRatio).toBeGreaterThanOrEqual(0);
    expect(s.endRatio).toBeLessThanOrEqual(1);
    expect(s.startRatio).toBeLessThan(s.endRatio);

    setStartRatio(1);
    s = get(editSession);
    expect(s.startRatio).toBeGreaterThanOrEqual(0);
    expect(s.endRatio).toBeLessThanOrEqual(1);
    expect(s.startRatio).toBeLessThan(s.endRatio);

    // Exhaustive interleaving over a grid of ratios; invariant must always hold.
    resetEditSession();
    const grid = [-1, 0, 0.1, 0.5, 0.9, 1, 2];
    for (const a of grid) {
      for (const b of grid) {
        setEndRatio(a);
        setStartRatio(b);
        const v1 = get(editSession);
        expect(v1.startRatio).toBeGreaterThanOrEqual(0);
        expect(v1.endRatio).toBeLessThanOrEqual(1);
        expect(v1.startRatio).toBeLessThan(v1.endRatio);

        setStartRatio(a);
        setEndRatio(b);
        const v2 = get(editSession);
        expect(v2.startRatio).toBeGreaterThanOrEqual(0);
        expect(v2.endRatio).toBeLessThanOrEqual(1);
        expect(v2.startRatio).toBeLessThan(v2.endRatio);
      }
    }
  });

  it('setEpsilon clamps to a non-negative number', () => {
    setEpsilon(25);
    expect(get(editSession).epsilon).toBe(25);
    setEpsilon(-3);
    expect(get(editSession).epsilon).toBe(0);
  });

  it('resetEditSession restores defaults', () => {
    setFileId('z');
    setEpsilon(40);
    resetEditSession();
    expect(get(editSession)).toEqual(DEFAULT_EDIT_SESSION);
  });
});
