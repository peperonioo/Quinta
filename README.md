# Quinta

A visual, flowstate-oriented harmony tool for musicians and producers.  
Interactive Circle of Fifths with modes, degrees, progression builder, and Klimper-style suggestion bubbles.

---

## How to run locally

Open `dist/Quinta.html` directly in any browser — it is fully self-contained.

Or serve it:
```
npm run serve
```
Then open `http://localhost:4242/Quinta.html`.

---

## How to build the standalone HTML

Requires Node.js ≥ 16.

```
node build.js
```

Output: `dist/Quinta.html`

The build script reads `src/template.html`, concatenates CSS from `src/styles/` and JS from `src/` in dependency order, and injects both into the template.

---

## How to run tests

Open the built HTML in a browser, then in the browser console:

```js
EFC_DEV.runTests()   // run all stability tests
EFC_DEV.report()     // full diagnostic report
EFC_DEV.state()      // current app state snapshot
EFC_DEV.duplicateIds() // check for duplicate DOM ids
```

Or press **⌘/Ctrl + Shift + D** to open the hidden dev panel.

---

## Architecture overview

The project is split into source modules under `src/` that are concatenated by `build.js` into a single standalone HTML. No bundler, no framework — pure concatenation in dependency order.

### Source structure

```
src/
  core/
    constants.js     — all static data (notes, modes, palettes, defaultState)
    state.js         — single mutable state object `st`
    actions.js       — ActionDispatcher + AppActions (all interactions route here)
    utils.js         — scale/chord helpers, SVG utils, normalizeKeyState
    init.js          — plasma WebGL, theme, app bootstrap IIFE
  i18n/
    en.js / es.js    — localization strings
    i18n.js          — t(), applyI18n(), setLanguage()
  theory/
    theory-data.js   — THEORY_DATA, PRODUCTION_DATA
    harmony-engine.js — gravity archetypes, mood profiles, transition scoring
    suggestion-engine.js — SuggestionEngine (next-chord candidates)
    wheel-direction-engine.js — Fifths/Fourths arc guide (new in V3.17)
  ui/
    render-engine.js — orchestrates full/partial render calls
    wheel-renderer.js — SVG wheel + rotation animation
    theory-renderer.js — degrees row, side cards, scale chips
    builder-renderer.js — HistoryEngine, BuilderEngine, progression pills
    suggestions-renderer.js — weighted bubble orbit
    instruments-renderer.js — piano, guitar/fretboard
    popover-manager.js — degree popup, micro-popovers
    mode-selector.js — ModeMenu (portaled custom dropdown)
    tabs.js          — tab switching, production panel, rhythm player
  interactions/
    wheel-interaction.js — drag-roulette, pointer handling
    builder-interaction.js — DegreeDrag, chord animation
    mobile-optimizer.js — InteractionController, MobileOptimizer
  styles/
    tokens.css       — CSS custom properties (z-index, radius, motion, colours)
    base.css         — reset, body, plasma canvas
    layout.css       — app, topbar, main-row, cards, bottom bar
    wheel.css        — SVG wheel, direction guide arcs
    degrees.css      — degrees row + popup
    builder.css      — progression builder + next-moves section
    suggestions.css  — bubble orbit, metric bars
    popovers.css     — overlay contract (mode menu, micro-popovers)
    instruments.css  — piano, fretboard
    production.css   — production tab, MIDI grid
    mobile.css       — responsive breakpoints
  dev/
    tests.js         — EFC_DEV stability suite + dev panel
  template.html      — HTML structure (%%CSS%% and %%JS%% replaced by build.js)
dist/
  Quinta.html  — generated standalone output
build.js             — build script
```

### State flow

```
User interaction
  → AppActions.setX()
    → ActionDispatcher.dispatch(ACTION, payload)
      → mutates st
      → calls RenderEngine.full() or .partial()
        → individual render functions update DOM
```

All state lives in `st` (a plain object, saved to localStorage).  
Renderers are pure DOM writers — they do not mutate state.

---

## Design direction

- **Feel**: a calm harmonic companion, not a theory textbook
- **Typography**: DM Serif Display for musical names, DM Mono for labels, DM Sans for body
- **Motion**: spring easing (`cubic-bezier(.22,1,.36,1)`), transforms + opacity only
- **Colour**: accent orange `#e8441a`, neutral warm whites/greys, dark-first palette

---

## What still needs work

See `CHANGELOG.md` → Roadmap for version targets. Priority order:

1. **V3.18** — Mobile QA pass (drag, safe-area, builder scroll on iOS Safari)
2. **V3.19** — Suggestion engine validation (musical correctness, genre bias)
3. **V3.20** — Final CSS de-override pass (remove any remaining duplicate selectors)
4. **V4.0** — Harmonic Playground (visual gravity, progression storytelling)

## Audio credits

Real piano sound: [Salamander Grand Piano V3](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html) by Alexander Holm, licensed [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/). A 17-sample subset (C2–C6) is served from `samples/piano/` and pitch-shifted to fill the range; everything else in the app is synthesised with Web Audio.

Real guitar sound: nylon guitar from the [VSCO 2 Community Edition](https://versilian-studios.com/vsco-community/) (CC0, public domain), via the tonejs-instruments compilation. 17 samples (E2–E5) in `samples/guitar/`.

## Copyright

© 2026 Pedro Ipince. All rights reserved. The source is published for
transparency; no reuse or redistribution is permitted — see [LICENSE](LICENSE).
Third-party audio samples keep their own licences (credited above).

Real bass sound: electric bass from the VSCO 2 Community Edition (CC0), via tonejs-instruments. 10 samples (E1–G3) in `samples/bass/`.

Instrument Pack 1 (free during beta): steel acoustic guitar (`samples/steel/`) and clean electric guitar (`samples/electric/`) from the [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) compilation (Creative Commons / VSCO2-sourced).

Real drum kits (Production tab): kick/snare/hat/tom one-shots per genre from the [Tone.js](https://github.com/Tonejs/audio) audio examples (MIT) — `samples/drums/`.
