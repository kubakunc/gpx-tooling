import { writable } from 'svelte/store';

export type Smoothing = 'low' | 'medium' | 'high';

export interface Settings {
  consentObtained: boolean;
  smoothing: Smoothing;
}

export const DEFAULT_SETTINGS: Settings = {
  consentObtained: false,
  smoothing: 'medium'
};

const STORAGE_KEY = 'gpx-suite-settings';
const VALID_SMOOTHING: Smoothing[] = ['low', 'medium', 'high'];

/** Pure: parse persisted JSON into a sanitised Settings, defaults on any failure. */
export function loadSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof Settings, unknown>>;
    const smoothing = VALID_SMOOTHING.includes(parsed.smoothing as Smoothing)
      ? (parsed.smoothing as Smoothing)
      : DEFAULT_SETTINGS.smoothing;
    return {
      consentObtained: Boolean(parsed.consentObtained),
      smoothing
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
