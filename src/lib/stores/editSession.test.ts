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
