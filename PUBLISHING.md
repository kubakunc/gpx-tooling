# Publikacja „GPX Editor" w Google Play — krok po kroku

Pakiet: `com.velologiclabs.gpxtools` · Deweloper: VeloLogic Labs
Plik do wgrania: `android/app/build/outputs/bundle/release/app-release.aab`

---

## ETAP 0 — Zanim zaczniesz (jednorazowo)

- [ ] **Zabezpiecz klucz podpisu.** Skopiuj `android/app/upload-keystore.jks`
      + hasło z `android/key.properties` do menedżera haseł. Bez tego nigdy nie
      zaktualizujesz aplikacji. (Plik i hasło NIE są w gicie.)
- [ ] **Konto Google Play Developer** — jeśli go nie masz: https://play.google.com/console
      → załóż (jednorazowa opłata 25 USD, weryfikacja tożsamości 1–2 dni).
      Wskazówka: konto **organizacyjne** (firma) jest zwolnione z obowiązku
      testów zamkniętych; konto **osobiste** założone po 13.11.2023 musi przejść
      14-dniowe testy z 12 testerami przed produkcją (patrz ETAP 6).
- [ ] **Hosting polityki prywatności** (potrzebny URL). Najszybciej GitHub Pages:
      GitHub → repo `kubakunc/gpx-tooling` → **Settings → Pages** → Source:
      „Deploy from a branch" → Branch `main`, folder `/docs` → Save. Po ~1 min
      działa: **https://kubakunc.github.io/gpx-tooling/privacy-policy.html**
      (otwórz w przeglądarce, żeby potwierdzić).

---

## ETAP 1 — Utwórz aplikację w Play Console

1. Play Console → **Create app**.
2. App name: **`GPX Editor: Merge, Fix & More`** (to jest tytuł w sklepie, ≤30 zn.,
   i to ono pozycjonuje) · Default language: **English (United States)** ·
   App or game: **App** · Free or paid: **Free**.
3. Zaakceptuj deklaracje (Developer Program Policies, US export laws) → **Create app**.

> Dwie różne nazwy (celowo): tytuł w sklepie = `GPX Editor: Merge, Fix & More`,
> a nazwa pod ikoną na telefonie = `GPX Editor` (krótka, z APK — żeby się nie
> ucięła). Nic w kodzie nie zmieniasz; długa nazwa wpisywana jest tylko w Console.

---

## ETAP 2 — Wypełnij „Dashboard → Set up your app"

Wszystkie teksty masz gotowe w `store-assets/play-listing.md`.

### 2a. App access
- [ ] „All functionality is available without special access" (apka nie wymaga
      logowania) → zaznacz tę opcję.

### 2b. Ads
- [ ] **Yes**, aplikacja zawiera reklamy (AdMob).

### 2c. Content rating
- [ ] Wypełnij kwestionariusz IARC. Kategoria: narzędzie/utility, brak treści
      wrażliwych → wynik **Everyone / PEGI 3**. E-mail: contact@velologic-labs.eu.

### 2d. Target audience
- [ ] Grupa wiekowa: **18+** (albo 13+), NIE kierowane do dzieci.

### 2e. Data safety  ⚠️ WAŻNE — nie deklaruj „no data"
Apka przetwarza pliki lokalnie, ALE dwa SDK Google zbierają dane:
- [ ] **Does your app collect or share user data?** → **Yes**.
- [ ] Zadeklaruj **Device or other IDs** (advertising ID) — cel: Advertising/marketing
      (AdMob). Zaznacz „Data is shared".
- [ ] Zadeklaruj **App activity → App interactions** (zdarzenia: które narzędzie
      otwarte, share/save) + identyfikator analityczny — cel: Analytics (Firebase).
      „Data is collected".
- [ ] Encrypted in transit: **Yes**. Pełna ściągawka w `store-assets/play-listing.md`
      (sekcja „Data safety").

### 2f. Government apps, Financial features, Health → zwykle „No".

---

## ETAP 3 — Store listing (wygląd w sklepie)

Menu: **Grow → Store presence → Main store listing**. Skopiuj z `store-assets/play-listing.md`:

- [ ] **App name:** `GPX Editor: Merge, Fix & More` (29 zn. — tytuł w sklepie)
- [ ] **Short description** (≤80 zn.):
      `Merge, trim, fix & convert GPX, FIT, TCX & KML tracks — 100% offline.`
- [ ] **Full description:** wklej całość z sekcji „Full description".
- [ ] **App icon (512×512):** `store-assets/play-icon-512.png`
- [ ] **Feature graphic (1024×500):** `store-assets/feature-graphic-a.png`
- [ ] **Phone screenshots (min 2, do 8):** wgraj z `store-assets/screenshots/`
      — polecam: 01-hub, 02-merge, 03-trim, 05-elevation, 07-compare, 11-repair.
- [ ] Kategoria aplikacji: **Maps & Navigation** (Console: Store settings).
- [ ] Tagi: GPS, Cycling, Running, Hiking, Maps.

> Uwaga ASO: pole **App name** w Console (do 30 zn.) to tytuł w sklepie i to ono
> najmocniej wpływa na pozycjonowanie — wpisz `GPX Editor: Merge, Fix & More`.
> Nazwa pod ikoną na telefonie zostaje krótka („GPX Editor", z APK).

---

## ETAP 4 — Privacy policy URL

- [ ] **Policy → App content → Privacy policy** → wklej:
      `https://kubakunc.github.io/gpx-tooling/privacy-policy.html`

---

## ETAP 5 — Wgraj build (AAB)

1. Zbuduj świeży podpisany AAB (jeśli coś zmieniałeś):
   ```bash
   npm run build && npx cap sync android
   cd android && ./gradlew bundleRelease
   ```
   Plik: `android/app/build/outputs/bundle/release/app-release.aab`
2. Play Console → **Test and release → Testing → Internal testing**
   (albo od razu **Production**, jeśli konto na to pozwala — patrz ETAP 6).
3. **Create new release**.
4. **App signing:** zaakceptuj **Play App Signing** (Google przechowuje klucz
   dystrybucyjny; Ty wgrywasz upload-keyem, który już masz). Kliknij dalej.
5. **App bundles** → wgraj `app-release.aab`.
6. **Release name** np. `1.0.0 (1)`. **Release notes** (en-US), np.:
   `First release: merge, trim, fix, convert and clean GPS tracks — offline.`
7. **Next → Save → Review release**.

---

## ETAP 6 — Testy / Produkcja

**Jeśli konto wymaga testów zamkniętych** (osobiste po 13.11.2023):
- [ ] Testing → **Closed testing** → utwórz track, dodaj ≥12 testerów
      (lista e-maili / grupa Google), opublikuj. Po 14 dniach aktywnych testów
      odblokuje się przycisk „Promote to Production".

**Jeśli konto organizacyjne / zwolnione:**
- [ ] Możesz iść prosto na **Production → Create release** (kroki jak ETAP 5).

W obu wariantach na końcu: **Send for review**. Pierwsza weryfikacja Google
trwa zwykle **kilka godzin–7 dni**.

---

## ETAP 7 — Po publikacji

- [ ] **AdMob:** w panelu AdMob połącz aplikację z pozycją w Google Play
      (app-ads.txt opcjonalnie, gdy będzie domena). Reklamy ruszą do ~1h po
      pierwszej instalacji z Play.
- [ ] **Firebase:** zdarzenia analityki pojawią się w Firebase → Analytics
      (DebugView od razu, raporty po ~24h).
- [ ] **Aktualizacje:** podbij `versionCode` (i `versionName`) w
      `android/app/build.gradle`, przebuduj AAB, wgraj nowy release.

---

## Szybka checklista „gotowe do wysłania"

| Pozycja | Status |
|---|---|
| AAB podpisany (`jar verified`) | ✅ gotowe |
| Ikona 512, feature graphic, screenshoty | ✅ w `store-assets/` |
| Opisy (tytuł/krótki/pełny) | ✅ w `play-listing.md` |
| Polityka prywatności (URL) | ⬜ włącz GitHub Pages (ETAP 0) |
| Data safety (AdMob + Firebase) | ⬜ wypełnij w Console (ETAP 2e) |
| Content rating, Target audience, Ads | ⬜ w Console (ETAP 2) |
| Klucz podpisu w backupie | ⬜ ZRÓB TO (ETAP 0) |
