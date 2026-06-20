import { writable, type Writable } from 'svelte/store';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
  InterstitialAdPluginEvents,
  type AdMobBannerSize,
  type AdmobConsentInfo,
  type AdLoadInfo,
  type BannerAdOptions,
  type AdOptions
} from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { setConsent } from '$lib/stores/settings';
import { canShow } from './frequencyCap';

/** Google-provided test ad unit IDs — used in dev/test builds. */
export const TEST_BANNER_AD_ID = 'ca-app-pub-3940256099942544/9214589741';
export const TEST_INTERSTITIAL_AD_ID = 'ca-app-pub-3940256099942544/1033173712';

/** Real AdMob ad unit IDs (publisher 2450963113368391) — used only in prod. */
export const PROD_BANNER_AD_ID = 'ca-app-pub-2450963113368391/5393003457';
export const PROD_INTERSTITIAL_AD_ID = 'ca-app-pub-2450963113368391/1584786235';

// Resolve ad IDs by build mode: real ad units only in a production build, Google
// test units everywhere else. Clicking your own LIVE ads during development is
// an AdMob policy violation (account-ban risk), so dev/test must never serve
// real ads. import.meta.env.PROD is true only for `vite build` (the release web
// bundle); it is false under Vitest and `vite dev`.
const ADS_PROD = import.meta.env.PROD;
export const BANNER_AD_ID = ADS_PROD ? PROD_BANNER_AD_ID : TEST_BANNER_AD_ID;
export const INTERSTITIAL_AD_ID = ADS_PROD ? PROD_INTERSTITIAL_AD_ID : TEST_INTERSTITIAL_AD_ID;
/** Whether to request Google test ads (true unless this is a production build). */
export const ADS_TESTING = !ADS_PROD;

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
    eventName: InterstitialAdPluginEvents | BannerAdPluginEvents,
    listenerFunc: (...args: never[]) => void
  ): Promise<PluginListenerHandle>;
}

/**
 * The measured native adaptive-banner height in CSS px. 0 on web (where we
 * render a placeholder) and until the banner reports its size on native.
 * Consumed by AdBanner to reserve the real strip height.
 */
export const bannerHeight: Writable<number> = writable(0);

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
  private bannerListenerBound = false;
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
      let info = await this.ads.requestConsentInfo();
      if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
        info = await this.ads.showConsentForm();
      }
      await this.ads.initialize({ initializeForTesting: ADS_TESTING });
      await this.bindBannerSizeListener();
      await this.ads.showBanner({
        adId: BANNER_AD_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: ADS_TESTING
      });
      // Persist the truthful consent outcome: OBTAINED or NOT_REQUIRED mean we
      // may serve personalised/standard ads; a still-REQUIRED status (form
      // unavailable or declined) leaves consent un-granted. Deliberately set
      // only after the banner shows so settings reflect a working ad pipeline.
      const consentResolved =
        info.status === AdmobConsentStatus.OBTAINED ||
        info.status === AdmobConsentStatus.NOT_REQUIRED;
      setConsent(consentResolved);
      this.state.update((s) => ({ ...s, bannerShown: true }));
    } catch {
      // Ads are best-effort; failures must never break the app.
      this.initialized = false;
    }
  }

  /**
   * Listen for the native adaptive banner's device-computed size and publish
   * its height (px) so the layout can reserve the real strip. Never throws.
   */
  private async bindBannerSizeListener(): Promise<void> {
    if (this.bannerListenerBound) return;
    this.bannerListenerBound = true;
    try {
      await this.ads.addListener(
        BannerAdPluginEvents.SizeChanged,
        ((size: AdMobBannerSize) => {
          if (size && typeof size.height === 'number' && size.height > 0) {
            bannerHeight.set(size.height);
          }
        }) as (...args: never[]) => void
      );
    } catch {
      this.bannerListenerBound = false;
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
        adId: INTERSTITIAL_AD_ID,
        isTesting: ADS_TESTING
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
    // Capture the clock once so the cap check and lastShown stamp agree.
    const t = this.now();
    if (!this.isNative() || !this.ready || !canShow(this.lastShownMs, t)) {
      onDismissed();
      return;
    }
    this.lastShownMs = t;
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
