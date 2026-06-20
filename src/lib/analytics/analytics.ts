import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * The slice of the Firebase Analytics plugin we depend on. Tests inject a fake;
 * the real singleton wires the actual `FirebaseAnalytics` plugin.
 */
export interface AnalyticsLike {
  logEvent(options: { name: string; params?: Record<string, unknown> }): Promise<void>;
  setCurrentScreen(options: { screenName: string }): Promise<void>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
}

export interface AnalyticsDeps {
  impl: AnalyticsLike;
  isNative: () => boolean;
}

/** Outcome reported for a Save action (mirrors FileService.SaveOutcome.saved). */
export type SaveResult = 'saved' | 'cancelled';

/**
 * Thin, fail-safe wrapper over Firebase Analytics. Every call is a no-op on web
 * and swallows errors, so a missing/again-misconfigured `google-services.json`
 * can never break a user flow — analytics is strictly best-effort telemetry.
 *
 * Event taxonomy (so reports stay consistent and finetuning is comparable):
 *   tool_open    { tool }                      — a tool screen was opened
 *   file_import  { tool, format, count }       — file(s) imported into a tool
 *   file_share   { tool, format }              — output shared via the share sheet
 *   file_save    { tool, format, result }      — output saved (or cancelled)
 *   tool_action  { tool, action, ... }         — a tool-specific control was used
 */
export class Analytics {
  private readonly impl: AnalyticsLike;
  private readonly isNative: () => boolean;

  constructor(deps: AnalyticsDeps) {
    this.impl = deps.impl;
    this.isNative = deps.isNative;
  }

  /** Low-level event. Native-only, never throws. */
  async track(name: string, params?: Record<string, unknown>): Promise<void> {
    if (!this.isNative()) return;
    try {
      await this.impl.logEvent({ name, params });
    } catch {
      // best-effort telemetry — ignore
    }
  }

  /** Record which tool screen the user opened. */
  toolOpen(tool: string): Promise<void> {
    return this.track('tool_open', { tool });
  }

  /** Record a file import (format = gpx|fit|mixed, count = files chosen). */
  fileImport(tool: string, format: string, count: number): Promise<void> {
    return this.track('file_import', { tool, format, count });
  }

  /** Record an output shared via the system share sheet. */
  fileShare(tool: string, format: string): Promise<void> {
    return this.track('file_share', { tool, format });
  }

  /** Record an output saved (or a cancelled save) via the file browser. */
  fileSave(tool: string, format: string, result: SaveResult): Promise<void> {
    return this.track('file_save', { tool, format, result });
  }

  /** Record a tool-specific control interaction (e.g. reorder, slider, toggle). */
  toolAction(tool: string, action: string, params?: Record<string, unknown>): Promise<void> {
    return this.track('tool_action', { tool, action, ...params });
  }
}

// Register the native plugin directly rather than importing the package's named
// export — that export pulls in the plugin's WEB implementation, which imports
// `firebase/analytics` (an optional peer dep we don't ship), breaking the web
// bundle. We only use analytics on native, so the registered proxy is enough.
const FirebaseAnalytics = registerPlugin<AnalyticsLike>('FirebaseAnalytics');

/** Shared singleton used by screens. */
export const analytics = new Analytics({
  impl: FirebaseAnalytics,
  isNative: () => Capacitor.isNativePlatform()
});
