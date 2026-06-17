// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  settings,
  setConsent,
  setSmoothing,
  loadSettings,
  serializeSettings,
  DEFAULT_SETTINGS,
  type Settings
} from './settings';

describe('settings pure helpers', () => {
  it('serializeSettings/loadSettings round-trip', () => {
    const s: Settings = { consentObtained: true, smoothing: 'high' };
    expect(loadSettings(serializeSettings(s))).toEqual(s);
  });

  it('loadSettings falls back to defaults on null/garbage', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings('not json')).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings('{}')).toEqual(DEFAULT_SETTINGS);
  });

  it('loadSettings sanitises invalid smoothing values', () => {
    const raw = JSON.stringify({ consentObtained: true, smoothing: 'bogus' });
    expect(loadSettings(raw)).toEqual({ consentObtained: true, smoothing: DEFAULT_SETTINGS.smoothing });
  });

  it('loadSettings coerces consentObtained to boolean', () => {
    const raw = JSON.stringify({ consentObtained: 'yes', smoothing: 'low' });
    expect(loadSettings(raw).consentObtained).toBe(true);
  });
});

describe('settings store', () => {
  beforeEach(() => {
    settings.set({ ...DEFAULT_SETTINGS });
  });

  it('setConsent / setSmoothing update the store', () => {
    setConsent(true);
    expect(get(settings).consentObtained).toBe(true);
    setSmoothing('high');
    expect(get(settings).smoothing).toBe('high');
  });

  it('persistence is guarded and does not throw when localStorage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => setConsent(true)).not.toThrow();
    spy.mockRestore();
  });
});
