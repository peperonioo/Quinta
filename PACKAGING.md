# Roadmap a app iOS (y el camino completo a producto)

> Actualizado con la auditoría V6.41 y pedido como roadmap oficial (ago 2026).
> Lo técnico está medio hecho: Capacitor ya está andamiado en este repo
> (`capacitor.config.json`, scripts `cap:*`). Lo que ordena este documento es
> CUÁNDO dar cada paso y qué puerta lo abre.

## El roadmap

| Fase | Qué | Coste | Puerta para avanzar |
|------|-----|-------|---------------------|
| **0 · PWA a amigos** (AHORA) | El enlace de /v2/ (o raíz al promocionar). Ya instalable, ya con telemetría, afinador y micro funcionando en Safari. | **0 €** | Ninguna — es esta semana |
| **1 · Leer el funnel** | 2 semanas de datos de amigos (las 5 preguntas del audit p.6) | 0 € | doGet/Drive desbloqueado |
| **2 · TestFlight** | Capacitor → Xcode → beta "app de verdad" para el círculo amplio | **99 $/año** (la cuenta Apple sirve para TestFlight Y para la store) | D7 amigos > 20% — no pagar cuota por un producto que no retiene |
| **3 · App Store** | Ficha pública, review de Apple | (misma cuota) | Retención estable + los "must" de abajo resueltos |
| **4 · Monetizar en iOS** | Studio como compra | 15-30% comisión Apple | Ventas web primero (Stripe en PWA, sin comisión) |

## Por qué PWA primero sigue siendo correcto

La app YA se instala en iOS (Compartir → Añadir a pantalla de inicio), suena,
afina y mide. El wrapper nativo no añade ninguna capacidad que Quinta necesite
hoy — añade distribución (store) y fricción de menos (instalar desde una ficha).
Ambas valen dinero y review; se compran cuando la retención diga que hay algo
que distribuir. Regla del proyecto desde el primer audit: **validar con
telemetría antes de pagar tiendas.**

## Fase 2 en detalle — de este repo a TestFlight (~1 día de trabajo)

1. Cuenta [Apple Developer](https://developer.apple.com) — 99 $/año.
2. `npm run cap:sync && npx cap add ios && npm run cap:ios` → abre Xcode.
3. En Xcode: firmar con tu equipo, bundle id `com.peperonioo.quinta` (revisar
   ANTES de subir nada: es permanente).
4. **Info.plist** — imprescindible para el afinador:
   `NSMicrophoneUsageDescription` = "Quinta usa el micrófono para afinar tu
   guitarra." Sin esta clave, getUserMedia crashea la app nativa.
5. Icono 1024×1024 — ya existe el arte (la Q de vidrio, `art/v2-icon-512.png`);
   regenerar a 1024 con el mismo harness.
6. Product → Archive → Distribute → TestFlight. Invitas por email.

Notas WKWebView (probado por otros, vigilar en la primera build):
- `getUserMedia` funciona en Capacitor desde iOS 14.3+ ✓ (el afinador vive).
- `localStorage` persiste ✓ (el documento vive).
- El service worker no hace falta dentro del wrapper (los archivos son locales).

## Fase 3 en detalle — los "must" de la review de Apple

- **Email de soporte real** (el `hello@quinta.app` de la landing no existe — es
  bloqueador de ficha, no solo estético).
- Política de privacidad (1 página: telemetría anónima, DNT respetado, sin
  cuentas). La "nutrition label" de App Store se rellena con eso.
- Guideline 4.2 (funcionalidad mínima): Quinta va sobrada — afinador +
  identificador + secuenciador + export es una app "de verdad".
- Si Studio se vende DENTRO de la app iOS → obligatorio IAP de Apple (15-30%).
  Por eso la fase 4 recomienda: vender primero en la web (Stripe, 0% de Apple),
  y en iOS decidir después entre IAP o app 100% completa sin compra.

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
