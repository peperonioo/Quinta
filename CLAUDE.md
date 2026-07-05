# Quinta — working agreement

Interactive circle-of-fifths PWA (vanilla JS, no framework). App = `dist/Quinta.html`
(self-contained) + `index.html` (GitHub Pages entry). Live: https://peperonioo.github.io/Quinta/

**Habla con el usuario en español.** Code, comments and commits in English.

## Release discipline (every user-visible change)

1. Bump `APP_VERSION` in [src/core/constants.js](src/core/constants.js) **and** `CACHE` in [sw.js](sw.js) (+0.01 each release).
2. `node build.js` — concatenates `src/` into `dist/Quinta.html` + `index.html`.
3. **Verify headless before committing** (see Verification below). Never ship unverified.
4. Commit with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. A `post-commit`
   hook auto-pushes → GitHub Pages deploys. Don't ask "¿push?"; don't run a separate push.
   Run commits with the sandbox disabled so the hook's push has network.
5. CI runs `EFC_DEV.runTests()` on push — check it stays green after risky changes.

Use the `/release` skill for this cycle, `/audit` for the product audit PDF.

## Verification (the reliable path here)

The preview MCP is flaky in this environment — use **playwright-core + system Chrome** instead:
`chromium.launch({ channel:'chrome', headless:true })` against `file://…/dist/Quinta.html`.
- Preset state via `addInitScript`: `localStorage['easy-fifth-circle:v1'] = {"onboarded":true,…}`
  and disable SW registration. Without `onboarded:true` the tour covers the UI.
- Run `EFC_DEV.runTests()` — **all tests must stay green** (they run silently: `__EFC_TESTING`
  suppresses telemetry/toasts/haptics; auto-run is localhost-only, never in user sessions).
- Sample loading needs HTTP: spin a tiny `node:http` static server on the repo root.
- Real interactions (drag/resize): use `page.mouse` events, then assert on `st`.

## Architecture in one breath

Single state object `st` (localStorage `easy-fifth-circle:v1`), mutated via
`AppActions`/`ActionDispatcher`. `st.history` aliases the active A/B section. Builder grid is
absolute: each chord has `start` + `beats`; drag physics in `_reflowDrag`, resize physics in
`DurationDrag` (chain-push, wall at 0). Audio: `AudioEngine` (Web Audio synth) + `_makeSampler`
instances (SamplePiano/SampleGuitar — lazy, persistent SW cache, synth fallback). `haptic()`
takes `'tap'|'sel'|'ok'` or raw ms.

## Product & design rules

- **No emojis in UI.** Functional glyphs come from the icon kit ([src/ui/icons.js](src/ui/icons.js));
  call `applyIcons(root)` after any dynamic render that includes `data-ico`.
- Every user-facing string ships in **EN + ES** ([src/i18n/](src/i18n/)). ES uses tú, opening ¿¡.
- Sounds are **warm and low, never shrill** ("anti-casino"): soft attacks, lowpass, quiet.
  UI sounds live in AudioEngine (`dialTick`, `dialSettle`).
- Destructive replacements of the progression call `snapshotAndOfferUndo()` first.
- Instrument audio credits (CC-BY/CC0) stay in Settings + README; LICENSE is all-rights-reserved.
- Product strategy: validate with telemetry before adding features or paying for stores.
  Events go via `tel(name, props)` → user's Google Sheet. Don't pollute it.

## Traps learned the hard way

- The SW serves stale HTML in previews — hard-reload or disable SW when testing.
- `location.hostname` gates dev-only behaviour (test auto-run) — file:// hostname is `''`.
- Boot chrome (splash/tour) races early test runs — tests drop it; splash is pointer-events:none.
- OG/social cards and PWA icons live at fixed URLs — regenerate, don't rename.
