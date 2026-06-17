import { writable, type Writable } from 'svelte/store';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdSize,
  BannerAdPosition,
  InterstitialAdPluginEvents,
  type AdmobConsentInfo,
  type AdLoadInfo,
  type BannerAdOptions,
  type AdOptions
} from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { setConsent } from '$lib/stores/settings';
import { canShow } from './frequencyCap';

/** Google-provided test ad unit IDs (swapped for real IDs in a later phase). */
export const TEST_BANNER_AD_ID = 'ca-app-pub-3940256099942544/9214589741';
export const TEST_INTERSTITIAL_AD_ID = 'ca-app-pub-3940256099942544/1033173712';

/**
 * The subset of the AdMob plugin surface AdManager depends on. Tests inject a
 * fake implementing this; the real singleton wires the actual `AdMob` plugin.
 */
export interface AdLike {
  initialize(options?: { initializeForTesting?: boolean }): Promise<void>;
  requestConsentInfo(): Promise<AdmobConsentInfo>;
  showConsentForm(): Promise<AdmobConsentInfo>;
  showBanner(options: BannerAdOptions): Promise<void>;
  prepareInterstitial(options: AdOptions): Promise<AdLoadInfo>;
  showInterstitial(): Promise<void>;
  addListener(
    eventName: InterstitialAdPluginEvents,
    listenerFunc: (...args: never[]) => void
  ): Promise<PluginListenerHandle>;
}

export interface AdManagerDeps {
  ads: AdLike;
  isNative: () => boolean;
  now: () => number;
}

export interface AdState {
  /** True once consent has been resolved and the banner shown (native only). */
  bannerShown: boolean;
  /** True when an interstitial is loaded and may be shown. */
  ready: boolean;
}

export class AdManager {
  readonly state: Writable<AdState> = writable({ bannerShown: false, ready: false });

  private readonly ads: AdLike;
  private readonly isNative: () => boolean;
  private readonly now: () => number;

  private initialized = false;
  private listenersBound = false;
  private preparing = false;
  private ready = false;
  private lastShownMs: number | null = null;
  /** Set transiently while an interstitial is on screen. */
  private pendingDismiss: (() => void) | null = null;

  constructor(deps: AdManagerDeps) {
    this.ads = deps.ads;
    this.isNative = deps.isNative;
    this.now = deps.now;
  }

  private setReady(ready: boolean): void {
    this.ready = ready;
    this.state.update((s) => ({ ...s, ready }));
  }

  /**
   * First-launch bootstrap: resolve UMP consent, initialise AdMob, show the
   * bottom adaptive banner. Idempotent and never throws to the caller.
   */
  async init(): Promise<void> {
    if (!this.isNative() || this.initialized) return;
    this.initialized = true;
    try {
      const info = await this.ads.requestConsentInfo();
      if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
        await this.ads.showConsentForm();
      }
      await this.ads.initialize({ initializeForTesting: true });
      await this.ads.showBanner({
        adId: TEST_BANNER_AD_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: true
      });
      setConsent(true);
      this.state.update((s) => ({ ...s, bannerShown: true }));
    } catch {
      // Ads are best-effort; failures must never break the app.
      this.initialized = false;
    }
  }

  private async bindInterstitialListeners(): Promise<void> {
    if (this.listenersBound) return;
    this.listenersBound = true;
    try {
      await this.ads.addListener(InterstitialAdPluginEvents.Loaded, () => {
        this.preparing = false;
        this.setReady(true);
      });
      await this.ads.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
        this.preparing = false;
        this.setReady(false);
      });
      await this.ads.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        this.setReady(false);
        const cb = this.pendingDismiss;
        this.pendingDismiss = null;
        if (cb) cb();
        // Pre-load the next interstitial for the following export.
        void this.prepareInterstitial();
      });
    } catch {
      this.listenersBound = false;
    }
  }

  /**
   * Preload an interstitial (native only). Idempotent: skips if one is already
   * loaded or a request is in flight. Never throws.
   */
  async prepareInterstitial(): Promise<void> {
    if (!this.isNative() || this.ready || this.preparing) return;
    this.preparing = true;
    try {
      await this.bindInterstitialListeners();
      await this.ads.prepareInterstitial({
        adId: TEST_INTERSTITIAL_AD_ID,
        isTesting: true
      });
    } catch {
      this.preparing = false;
    }
  }

  /**
   * Show a preloaded interstitial if one is ready and the frequency cap allows.
   * Otherwise calls `onDismissed` immediately. Intended to be called only after
   * a successful export — never mid-operation. Never throws.
   */
  async showInterstitialIfReady(onDismissed: () => void): Promise<void> {
    if (!this.isNative() || !this.ready || !canShow(this.lastShownMs, this.now())) {
      onDismissed();
      return;
    }
    this.lastShownMs = this.now();
    this.setReady(false);
    this.pendingDismiss = onDismissed;
    try {
      await this.ads.showInterstitial();
    } catch {
      // If the show fails we won't get a Dismissed event — release the callback.
      const cb = this.pendingDismiss;
      this.pendingDismiss = null;
      if (cb) cb();
    }
  }

  /** Re-open the UMP consent / privacy options form (native only). Never throws. */
  async reopenConsentForm(): Promise<void> {
    if (!this.isNative()) return;
    try {
      await this.ads.showConsentForm();
    } catch {
      // Best-effort.
    }
  }
}

/**
 * Real dependencies for the app-wide singleton: the AdMob plugin, the
 * Capacitor native-platform check, and the wall clock. Exported for testing.
 */
export const realAdDeps: AdManagerDeps = {
  ads: AdMob as unknown as AdLike,
  isNative: () => Capacitor.isNativePlatform(),
  now: () => Date.now()
};

/** App-wide singleton wired to the real plugin, platform check, and clock. */
export const adManager = new AdManager(realAdDeps);
