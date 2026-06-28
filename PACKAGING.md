# Packaging Quinta for the App Stores (Capacitor)

The app is a static PWA built into `dist/`. Capacitor wraps that `dist/` in a
native iOS/Android shell you can submit to the App Store and Google Play. The web
code, the build (`node build.js`) and the deploy (GitHub Pages) are unchanged —
Capacitor just adds native projects beside them.

This was scaffolded already:
- `capacitor.config.json` — points Capacitor at `webDir: "dist"`.
- `package.json` — Capacitor deps + `cap:sync` / `cap:ios` / `cap:android` scripts.

> **Bundle ID:** currently `com.peperonioo.quinta` in `capacitor.config.json`.
> Pick the final value **before** you create the App Store / Play listing — it is
> permanent once submitted and tied to your developer account.

---

## 0. What it costs

| Store | Cost | Notes |
|-------|------|-------|
| Apple App Store | **$99 / year** | Required for the store **and** TestFlight beta. |
| Google Play | **$25 one-time** | Cheaper, faster review. |
| PWA (no store) | **Free** | Already installable via "Add to Home Screen". |

---

## 1. One-time setup (your Mac)

```bash
# install the project's build deps
npm install

# add Capacitor (writes it into package.json + the lockfile on your machine).
# It is intentionally NOT in package.json so CI's `npm ci` stays in sync — the
# native toolchain is a developer-machine concern.
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# build the web app into dist/
npm run build

# add the native platforms you want (uses the existing capacitor.config.json;
# creates ios/ and/or android/ folders)
npx cap add ios
npx cap add android
```

**Prerequisites**
- **iOS:** macOS + **Xcode** (App Store) + **CocoaPods** (`sudo gem install cocoapods`
  or `brew install cocoapods`) + an **Apple Developer Program** account ($99/yr).
- **Android:** **Android Studio** (bundles the SDK) + a **Google Play Console**
  account ($25 once). A JDK ships with Android Studio.

Commit the generated `ios/` and `android/` folders — they hold your native config.

---

## 2. The everyday cycle

Whenever you change the web app:

```bash
npm run cap:sync          # build.js → copy dist into both native projects
# or open a specific platform's IDE to run/submit:
npm run cap:ios           # build + sync + open Xcode
npm run cap:android       # build + sync + open Android Studio
```

`cap sync` copies the freshly-built `dist/` into the native projects and updates
native plugins. Always run a build first (the scripts above do it for you).

---

## 3. iOS → App Store

1. `npm run cap:ios` opens the project in Xcode.
2. Select the **App** target → **Signing & Capabilities** → check *Automatically
   manage signing* and pick your **Team** (your Apple Developer account).
3. Set the **Bundle Identifier** to match `capacitor.config.json`.
4. Set **Display Name**, **Version** (e.g. `5.47`) and **Build** number.
5. Pick a real device or "Any iOS Device" → **Product ▸ Archive**.
6. In the Organizer: **Distribute App ▸ App Store Connect ▸ Upload**.
7. In [App Store Connect](https://appstoreconnect.apple.com): create the app
   record, attach the build, fill metadata (below), submit for review.
   - **TestFlight** lets you (and beta testers) install the uploaded build before
     public release — do this first.

**iOS notes**
- App icons: drop a 1024×1024 master into Xcode's asset catalog (Capacitor
  generates the rest, or use `@capacitor/assets`, see §6).
- The web `<meta theme-color>` and `background_color` (#0a0a0b) already match the
  native background, so there's no white flash.
- Haptics: web `navigator.vibrate` is a no-op on iOS. For real iOS haptics later,
  add `@capacitor/haptics` and call it from the app.

---

## 4. Android → Google Play

1. `npm run cap:android` opens Android Studio.
2. **Build ▸ Generate Signed Bundle / APK ▸ Android App Bundle (.aab)**.
3. Create (and **back up!**) a signing keystore — losing it means you can't update
   the app later.
4. In the [Play Console](https://play.google.com/console): create the app, upload
   the `.aab` to a testing track first, fill metadata, then promote to production.

---

## 5. Store listing checklist

- [ ] **App name:** Quinta
- [ ] **Subtitle / short description:** e.g. "Visual circle of fifths & chord builder"
- [ ] **Description** (EN + ES — the app is bilingual)
- [ ] **Keywords:** circle of fifths, music theory, chords, progression, songwriting
- [ ] **Category:** Music (secondary: Education)
- [ ] **Privacy Policy URL:** `https://peperonioo.github.io/Quinta/privacy.html` ✅ (done)
- [ ] **Privacy "nutrition" answers:** *No data collected* (true — see privacy.html)
- [ ] **Support URL / contact email**
- [ ] **Age rating:** 4+ / Everyone
- [ ] **Screenshots:** required sizes — iPhone 6.7" (1290×2796) & 6.5"; iPad 12.9";
      Android phone + 7"/10" tablet. Capture from the deployed app / simulator.
- [ ] **App icon:** 1024×1024 (iOS), 512×512 (Play)

---

## 6. Generating native icons & splash (optional helper)

```bash
npm i -D @capacitor/assets
# put a 1024×1024 icon.png (and optional splash.png) in ./assets/
npx capacitor-assets generate
```

This produces every iOS/Android icon + splash size from the master images.

---

## 7. Version bumping for releases

Keep these in sync each release:
- `src/core/constants.js` → `APP_VERSION`
- `sw.js` → `CACHE`
- iOS: Xcode target **Version** + **Build**
- Android: `android/app/build.gradle` → `versionName` + `versionCode`

---

## Fast alternative: PWABuilder

If you'd rather skip native tooling for a first pass, https://www.pwabuilder.com
ingests the deployed PWA URL and emits store packages (iOS WKWebView wrapper,
Android TWA). Less control than Capacitor, but quickest to a TestFlight/Play build.
You still need the same paid developer accounts to publish.
