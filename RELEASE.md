# Release runbook — GPX Editor (com.velologiclabs.gpxtools)

## 1. Signing key (CRITICAL — back this up)

The upload keystore lives at `android/app/upload-keystore.jks`; its credentials are
in `android/key.properties`. **Both are gitignored and exist only on this machine.**

> If you lose this keystore or its password, you can NEVER publish an update to the
> same app again. Copy `upload-keystore.jks` **and** the password into a password
> manager / offline backup now.

- Alias: `upload`
- The password is stored in `android/key.properties` (gitignored). Copy it into
  your password manager — it is required for every future release.

## 2. Versioning

Set in `android/app/build.gradle` before each release:
- `versionCode` — integer, **must increase** every upload (1, 2, 3, …).
- `versionName` — user-facing string (currently `1.0.0`).

## 3. Build the release bundle (AAB → upload to Play)

```bash
npm run build                 # web assets (production: real AdMob IDs)
npx cap sync android
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab  (signed, upload this)
```

A signed APK for sideload testing: `./gradlew assembleRelease`
→ `android/app/build/outputs/apk/release/app-release.apk`.

## 4. Ads (AdMob)

- App ID is set in `AndroidManifest.xml`.
- Ad unit IDs are resolved by build mode in `src/lib/ads/AdManager.ts`:
  **real** units in a production `vite build`, Google **test** units in dev/test.
  Never click your own live ads on a production build — it can get the AdMob
  account banned.

## 4b. Analytics (Firebase) — needs google-services.json

Event tracking is wired in `src/lib/analytics/analytics.ts` and fires on every
tool (tool_open, file_import, file_share, file_save, tool_action). It is a no-op
until a Firebase config file is present — the build still works without it.

To turn it on:
1. Firebase console → create/select a project → Add app → **Android**, package
   `com.velologiclabs.gpxtools`. (You can link this Firebase project to the same
   Google account as AdMob.)
2. Download **google-services.json** and drop it at `android/app/google-services.json`.
   (`app/build.gradle` auto-applies the google-services plugin when the file exists.)
3. Rebuild: `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease`.
4. Events appear in Firebase → Analytics → DebugView (enable debug:
   `adb shell setprop debug.firebase.analytics.app com.velologiclabs.gpxtools`)
   and in the standard reports within ~24h.

Event taxonomy (for building dashboards): see the doc comment at the top of
`src/lib/analytics/analytics.ts`.

## 5. Privacy policy (GitHub Pages)

The policy page is committed at `docs/privacy-policy.html`. Enable hosting once:

1. GitHub → repo **Settings → Pages**.
2. Source: **Deploy from a branch** → Branch: `main`, Folder: `/docs` → Save.
3. After ~1 min it is live at:
   **https://kubakunc.github.io/gpx-tooling/privacy-policy.html**
4. Paste that URL into Play Console → Store listing → Privacy policy, and into the
   AdMob app's privacy policy field.

> Later: once **velologic-labs.eu** hosts both apps, move the policy there (e.g.
> `https://velologic-labs.eu/gpx-editor/privacy`) and just update the URL in Play
> Console + AdMob. GitHub Pages is only the interim host so launch isn't blocked.

## 6. Play Console checklist

- Create app → name **GPX Editor**, language en-US, app (not game), free.
- Store listing: copy from `store-assets/play-listing.md`; upload icon
  (`store-assets/play-icon-512.png`), feature graphic, and screenshots
  (`store-assets/screenshots/`).
- Content rating questionnaire (Everyone), Data safety (ads collect Advertising
  ID), Ads = Yes, Target audience, Privacy policy URL.
- Upload `app-release.aab` to a release track.

> New **personal** developer accounts created after 13 Nov 2023 must run a closed
> test with ≥12 testers for 14 days before production is unlocked. Organisation
> accounts are exempt. Choose Internal/Closed testing first if this applies to you.
