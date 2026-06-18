// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { AdManager, adManager, realAdDeps, bannerHeight, type AdLike } from './AdManager';
import { settings } from '$lib/stores/settings';
// Enums are plain value modules (no native bridge); safe to import in tests.
import {
  AdmobConsentStatus,
  BannerAdPluginEvents as BannerEvents,
  InterstitialAdPluginEvents as InterstitialEvents
} from '@capacitor-community/admob';

type Listener = (...args: unknown[]) => void;

/** A controllable fake of the AdMob plugin surface used by AdManager. */
function makeFakeAds(overrides: Partial<AdLike> = {}) {
  const listeners = new Map<string, Listener[]>();
  const calls: Record<string, unknown[][]> = {
    initialize: [],
    requestConsentInfo: [],
    showConsentForm: [],
    showBanner: [],
    prepareInterstitial: [],
    showInterstitial: []
  };

  const fake: AdLike = {
    initialize: vi.fn(async (...a: unknown[]) => {
      calls.initialize.push(a);
    }),
    requestConsentInfo: vi.fn(async (...a: unknown[]) => {
      calls.requestConsentInfo.push(a);
      return { status: AdmobConsentStatus.NOT_REQUIRED, isConsentFormAvailable: false };
    }),
    showConsentForm: vi.fn(async (...a: unknown[]) => {
      calls.showConsentForm.push(a);
      return { status: AdmobConsentStatus.OBTAINED, isConsentFormAvailable: true };
    }),
    showBanner: vi.fn(async (...a: unknown[]) => {
      calls.showBanner.push(a);
    }),
    prepareInterstitial: vi.fn(async (...a: unknown[]) => {
      calls.prepareInterstitial.push(a);
      return { adUnitId: 'x' };
    }),
    showInterstitial: vi.fn(async (...a: unknown[]) => {
      calls.showInterstitial.push(a);
    }),
    addListener: vi.fn(async (event: string, fn: Listener) => {
      const list = listeners.get(event) ?? [];
      list.push(fn);
      listeners.set(event, list);
      return { remove: async () => {} };
    }),
    ...overrides
  };

  const emit = (event: string, ...args: unknown[]) => {
    for (const fn of listeners.get(event) ?? []) fn(...args);
  };

  return { fake, calls, emit };
}

function makeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    }
  };
}

beforeEach(() => {
  settings.set({ consentObtained: false, smoothing: 'medium', units: 'metric' });
  bannerHeight.set(0);
});

describe('AdManager — web (non-native)', () => {
  it('init() is a no-op and does not touch the plugin', async () => {
    const { fake, calls } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => false, now: () => 0 });
    await mgr.init();
    expect(calls.requestConsentInfo).toHaveLength(0);
    expect(calls.initialize).toHaveLength(0);
    expect(calls.showBanner).toHaveLength(0);
    expect(get(mgr.state).bannerShown).toBe(false);
  });

  it('prepareInterstitial() is a no-op', async () => {
    const { fake, calls } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => false, now: () => 0 });
    await mgr.prepareInterstitial();
    expect(calls.prepareInterstitial).toHaveLength(0);
  });

  it('showInterstitialIfReady() calls onDismissed immediately', async () => {
    const { fake, calls } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => false, now: () => 0 });
    const onDismissed = vi.fn();
    await mgr.showInterstitialIfReady(onDismissed);
    expect(onDismissed).toHaveBeenCalledOnce();
    expect(calls.showInterstitial).toHaveLength(0);
  });

  it('reopenConsentForm() is a no-op', async () => {
    const { fake, calls } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => false, now: () => 0 });
    await mgr.reopenConsentForm();
    expect(calls.showConsentForm).toHaveLength(0);
  });
});

describe('AdManager — native init + consent', () => {
  it('shows consent form when REQUIRED and form available, then initialises + banner', async () => {
    const { fake, calls } = makeFakeAds({
      requestConsentInfo: vi.fn(async () => ({
        status: AdmobConsentStatus.REQUIRED,
        isConsentFormAvailable: true
      }))
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.init();
    expect(calls.showConsentForm).toHaveLength(1);
    expect(calls.initialize).toHaveLength(1);
    expect(calls.initialize[0][0]).toMatchObject({ initializeForTesting: true });
    expect(calls.showBanner).toHaveLength(1);
    expect(calls.showBanner[0][0]).toMatchObject({
      position: 'BOTTOM_CENTER',
      adSize: 'ADAPTIVE_BANNER',
      isTesting: true
    });
    expect(get(settings).consentObtained).toBe(true);
    expect(get(mgr.state).bannerShown).toBe(true);
  });

  it('skips consent form when NOT_REQUIRED but still initialises + banner', async () => {
    const { fake, calls } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.init();
    expect(calls.showConsentForm).toHaveLength(0);
    expect(calls.initialize).toHaveLength(1);
    expect(calls.showBanner).toHaveLength(1);
    expect(get(settings).consentObtained).toBe(true);
  });

  it('skips consent form when REQUIRED but no form available', async () => {
    const { fake, calls } = makeFakeAds({
      requestConsentInfo: vi.fn(async () => ({
        status: AdmobConsentStatus.REQUIRED,
        isConsentFormAvailable: false
      }))
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.init();
    expect(calls.showConsentForm).toHaveLength(0);
    expect(calls.initialize).toHaveLength(1);
  });

  it('does NOT record consent when status stays REQUIRED (declined / no form)', async () => {
    // Form unavailable and consent still REQUIRED → the flag must stay false,
    // reflecting the real outcome rather than a hardcoded true.
    const { fake } = makeFakeAds({
      requestConsentInfo: vi.fn(async () => ({
        status: AdmobConsentStatus.REQUIRED,
        isConsentFormAvailable: false
      }))
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.init();
    expect(get(settings).consentObtained).toBe(false);
    // The banner still shows — ads are best-effort regardless of the flag.
    expect(get(mgr.state).bannerShown).toBe(true);
  });

  it('records consent when the form flow ends OBTAINED', async () => {
    const { fake } = makeFakeAds({
      requestConsentInfo: vi.fn(async () => ({
        status: AdmobConsentStatus.REQUIRED,
        isConsentFormAvailable: true
      })),
      // showConsentForm in the default fake resolves to OBTAINED.
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.init();
    expect(get(settings).consentObtained).toBe(true);
  });

  it('never throws when the plugin rejects', async () => {
    const { fake } = makeFakeAds({
      requestConsentInfo: vi.fn(async () => {
        throw new Error('boom');
      })
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await expect(mgr.init()).resolves.toBeUndefined();
    expect(get(mgr.state).bannerShown).toBe(false);
  });

  it('publishes the real banner height on SizeChanged and ignores zero heights', async () => {
    const { fake, emit } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.init();
    expect(get(bannerHeight)).toBe(0);
    emit(BannerEvents.SizeChanged, { width: 320, height: 0 });
    expect(get(bannerHeight)).toBe(0); // zero ignored — keep the fallback
    emit(BannerEvents.SizeChanged, { width: 320, height: 62 });
    expect(get(bannerHeight)).toBe(62);
  });

  it('init() still shows the banner when the size listener fails to bind', async () => {
    const { fake, calls } = makeFakeAds({
      addListener: vi.fn(async () => {
        throw new Error('listener boom');
      })
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await expect(mgr.init()).resolves.toBeUndefined();
    expect(calls.showBanner).toHaveLength(1);
    expect(get(mgr.state).bannerShown).toBe(true);
    expect(get(bannerHeight)).toBe(0);
  });

  it('init() is idempotent — does not show two banners', async () => {
    const { fake, calls } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.init();
    await mgr.init();
    expect(calls.showBanner).toHaveLength(1);
  });
});

describe('AdManager — interstitial lifecycle', () => {
  it('prepareInterstitial requests with test id and sets ready on Loaded', async () => {
    const { fake, calls, emit } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.prepareInterstitial();
    expect(calls.prepareInterstitial).toHaveLength(1);
    expect(calls.prepareInterstitial[0][0]).toMatchObject({ isTesting: true });
    expect(get(mgr.state).ready).toBe(false);
    emit(InterstitialEvents.Loaded);
    expect(get(mgr.state).ready).toBe(true);
  });

  it('prepareInterstitial is idempotent while a request is pending', async () => {
    const { fake, calls } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.prepareInterstitial();
    await mgr.prepareInterstitial();
    expect(calls.prepareInterstitial).toHaveLength(1);
  });

  it('FailedToLoad clears ready and allows re-prepare', async () => {
    const { fake, calls, emit } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.prepareInterstitial();
    emit(InterstitialEvents.Loaded);
    emit(InterstitialEvents.FailedToLoad, { code: 1, message: 'no fill' });
    expect(get(mgr.state).ready).toBe(false);
    await mgr.prepareInterstitial();
    expect(calls.prepareInterstitial).toHaveLength(2);
  });

  it('showInterstitialIfReady no-ops (calls onDismissed) when not ready', async () => {
    const { fake, calls } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.prepareInterstitial();
    const onDismissed = vi.fn();
    await mgr.showInterstitialIfReady(onDismissed);
    expect(calls.showInterstitial).toHaveLength(0);
    expect(onDismissed).toHaveBeenCalledOnce();
  });

  it('shows when ready, records lastShown, and onDismissed fires on Dismissed event', async () => {
    const clock = makeClock(1000);
    const { fake, calls, emit } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: clock.now });
    await mgr.prepareInterstitial();
    emit(InterstitialEvents.Loaded);
    const onDismissed = vi.fn();
    await mgr.showInterstitialIfReady(onDismissed);
    expect(calls.showInterstitial).toHaveLength(1);
    expect(onDismissed).not.toHaveBeenCalled();
    expect(get(mgr.state).ready).toBe(false);
    // Dismissed should fire the callback and re-prepare a fresh interstitial.
    emit(InterstitialEvents.Dismissed);
    expect(onDismissed).toHaveBeenCalledOnce();
    await Promise.resolve(); // flush the async re-prepare
    await Promise.resolve();
    expect(calls.prepareInterstitial).toHaveLength(2);
  });

  it('respects the 3-minute cap across the injected clock', async () => {
    const clock = makeClock(1000);
    const { fake, calls, emit } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: clock.now });

    await mgr.prepareInterstitial();
    emit(InterstitialEvents.Loaded);
    await mgr.showInterstitialIfReady(() => {});
    emit(InterstitialEvents.Dismissed);
    expect(calls.showInterstitial).toHaveLength(1);

    // Re-prepared and loaded again, but still inside the cap window.
    emit(InterstitialEvents.Loaded);
    clock.advance(179_999);
    const onDismissed = vi.fn();
    await mgr.showInterstitialIfReady(onDismissed);
    expect(calls.showInterstitial).toHaveLength(1); // capped, not shown
    expect(onDismissed).toHaveBeenCalledOnce();

    // Past the cap → shows again.
    clock.advance(2);
    await mgr.showInterstitialIfReady(() => {});
    expect(calls.showInterstitial).toHaveLength(2);
  });

  it('prepareInterstitial swallows a rejecting prepare call', async () => {
    const { fake } = makeFakeAds({
      prepareInterstitial: vi.fn(async () => {
        throw new Error('no fill');
      })
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await expect(mgr.prepareInterstitial()).resolves.toBeUndefined();
    expect(get(mgr.state).ready).toBe(false);
    // preparing flag reset → a later prepare is allowed.
    await expect(mgr.prepareInterstitial()).resolves.toBeUndefined();
  });

  it('prepareInterstitial swallows a rejecting addListener call', async () => {
    const { fake } = makeFakeAds({
      addListener: vi.fn(async () => {
        throw new Error('listener boom');
      })
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await expect(mgr.prepareInterstitial()).resolves.toBeUndefined();
  });

  it('showInterstitial rejection is swallowed and onDismissed still fires', async () => {
    const { fake, emit } = makeFakeAds({
      showInterstitial: vi.fn(async () => {
        throw new Error('show failed');
      })
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.prepareInterstitial();
    emit(InterstitialEvents.Loaded);
    const onDismissed = vi.fn();
    await expect(mgr.showInterstitialIfReady(onDismissed)).resolves.toBeUndefined();
    expect(onDismissed).toHaveBeenCalledOnce();
  });
});

describe('AdManager — real singleton wiring', () => {
  it('exposes a singleton with default deps', () => {
    expect(adManager).toBeInstanceOf(AdManager);
  });

  it('isNative resolves a boolean and now resolves a number', () => {
    expect(typeof realAdDeps.isNative()).toBe('boolean');
    expect(typeof realAdDeps.now()).toBe('number');
    expect(realAdDeps.now()).toBeGreaterThan(0);
  });
});

describe('AdManager — reopenConsentForm (native)', () => {
  it('calls showConsentForm', async () => {
    const { fake, calls } = makeFakeAds();
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await mgr.reopenConsentForm();
    expect(calls.showConsentForm).toHaveLength(1);
  });

  it('never throws when showConsentForm rejects', async () => {
    const { fake } = makeFakeAds({
      showConsentForm: vi.fn(async () => {
        throw new Error('no form');
      })
    });
    const mgr = new AdManager({ ads: fake, isNative: () => true, now: () => 0 });
    await expect(mgr.reopenConsentForm()).resolves.toBeUndefined();
  });
});
