import { writable } from 'svelte/store';

export type Smoothing = 'low' | 'medium' | 'high';
export type Units = 'metric' | 'imperial';

export interface Settings {
  consentObtained: boolean;
  smoothing: Smoothing;
  units: Units;
}

export const DEFAULT_SETTINGS: Settings = {
  consentObtained: false,
  smoothing: 'medium',
  units: 'metric'
};

const STORAGE_KEY = 'gpx-suite-settings';
const VALID_SMOOTHING: Smoothing[] = ['low', 'medium', 'high'];
const VALID_UNITS: Units[] = ['metric', 'imperial'];

/** Pure: parse persisted JSON into a sanitised Settings, defaults on any failure. */
export function loadSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof Settings, unknown>>;
    const smoothing = VALID_SMOOTHING.includes(parsed.smoothing as Smoothing)
      ? (parsed.smoothing as Smoothing)
      : DEFAULT_SETTINGS.smoothing;
    const units = VALID_UNITS.includes(parsed.units as Units)
      ? (parsed.units as Units)
      : DEFAULT_SETTINGS.units;
    return {
      consentObtained: Boolean(parsed.consentObtained),
      smoothing,
      units
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Pure: serialise Settings to a JSON string. */
export function serializeSettings(s: Settings): string {
  return JSON.stringify(s);
}

function readPersisted(): Settings {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
    return loadSettings(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persist(s: Settings): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, serializeSettings(s));
  } catch {
    // Storage unavailable / quota — silently no-op.
  }
}

export const settings = writable<Settings>(readPersisted());

export function setConsent(consentObtained: boolean): void {
  settings.update((s) => {
    const next = { ...s, consentObtained };
    persist(next);
    return next;
  });
}

export function setSmoothing(smoothing: Smoothing): void {
  settings.update((s) => {
    const next = { ...s, smoothing };
    persist(next);
    return next;
  });
}

export function setUnits(units: Units): void {
  settings.update((s) => {
    const next = { ...s, units };
    persist(next);
    return next;
  });
}
