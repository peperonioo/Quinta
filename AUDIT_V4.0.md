# Easy Fifth Circle — V4.0 Full Code Audit & Roadmap

*Updated audit after the V3.18–V3.22 stabilization phase and the V4.0 "Motion & Life" work.*
*(Supersedes the original V3.17 single-file audit.)*

---

## Executive read

The project has crossed from "promising prototype" into a **real, modular product**.
The original V3.17 audit's biggest worry — *keeping a single 3.9k-line HTML file stable
while adding smart features* — is now structurally solved: the app is a clean `src/`
tree compiled to one standalone HTML by a repeatable build. The whole stabilization
roadmap (Mobile QA, Suggestion Engine validation, CSS de-override, Overlay Manager,
Test Suite) shipped, and V4.0 added a layer of tasteful motion (breathing wheel,
selection FX, harmonic-gravity arcs, fly-to-pill, colourful animated background).

The next risk is no longer architecture — it's **trust and depth**: you can *build* a
progression beautifully but you still can't **hear** it, and a few classes of bug
(invisible overlays blocking input, index-based SVG selectors) show the interaction
surface needs guard-rails the unit tests don't yet cover.

---

## 1. Current snapshot (V4.0)

| Metric | V3.17 (old) | V4.0 (now) |
|---|---|---|
| Structure | 1 HTML file | `src/` tree → built standalone |
| Standalone size | 231 KB | ~200 KB |
| JS | 2,606 lines (1 file) | 2,932 lines / **25 modules** |
| CSS | 1,076 lines | 1,104 lines / **11 layers** |
| Functions | ~112 | ~80 (smaller, layered) |
| `!important` | n/a | **151** (was 154; mostly defensive) |
| Duplicate selector groups | ~126 | ~3 real (rest are responsive) |
| Duplicate ids | `wheelPointer` ×2 | **0** (tested) |
| Dev tests | `EFC_DEV.runTests()` | **41 tests, all green** |
| Diagnostics | basic | `runTests` · `mobileCheck` · `cssHealth` · `report` |
| Deploy | manual file | **GitHub Pages**, `build.js` emits `index.html` |

**Modules:** core (state, actions, constants, utils, init) · theory (theory-data,
harmony-engine, suggestion-engine, wheel-direction-engine) · ui (render-engine,
wheel-renderer, theory/builder/suggestions/instruments renderers, popover-manager +
OverlayManager, mode-selector, tabs) · interactions (wheel, builder, mobile-optimizer)
· i18n (en/es) · dev (tests + diagnostics).

---

## 2. What shipped since the last audit

- **V3.18 Mobile QA** — touch-action pan-x scrollers, tappable bubbles, drawers
  collapsed on mobile, reduced-cost plasma, `EFC_DEV.mobileCheck()`.
- **V3.19 Suggestion Engine validation** — progression *memory* (cadence completion
  ii–V–I, repetition/vamp recognition, modal signatures, position), self-explaining
  reasons, +12 validation tests.
- **V3.20 CSS de-override** — removed genuine duplicates, `cssHealth()` metric.
- **V3.21 Overlay Manager** — one contract for mode dropdown / banners / popovers /
  degree popup; opening one closes others; single Escape.
- **V3.22 Test Suite** — progression add/delete/reorder/clear, bubble sizing,
  major/minor centre mapping (41 tests total).
- **Circle-of-Fifths explainer** — small spread banners (what / fifths / fourths).
- **V4.0 Motion** — wheel breathing + tonic heartbeat, ambient rim sweep, selection
  ripple/bloom/cascade, fly-to-pill, theme wipe, flowing pill connectors,
  **harmonic-gravity arcs**, and a **colourful animated plasma** background.

---

## 3. Strengths

- **Clear identity:** a calm, visual harmony instrument — not a theory textbook.
- **Modular and buildable:** logic / render / interaction are separated; one command
  produces a shareable standalone, and Pages auto-deploys from `main`.
- **The wheel is the anchor** and now feels alive (breathing, gravity, glow).
- **Suggestion engine has real musical logic** (functional, modal, cadence, vamp),
  with short honest reasons and strength-by-size bubbles in degree order.
- **Self-testing:** 41 dev checks + mobile + CSS health, run on load, surfaced in a
  hidden dev panel — a strong regression base for a project this size.
- **Bilingual (EN/ES)** with strings centralised in `i18n/`.

## 4. Weaknesses, risks & tech debt

1. **No audio.** The single biggest gap. You can design a progression and never hear
   it. This caps the tool's usefulness and "trust" more than any other item.
2. **Interaction bugs slip past unit tests.** Two recent ones — closed direction-guide
   cards forming an invisible click-wall over the top bar, and an SVG circle inserted
   in the middle shifting `querySelectorAll('circle')[1]` so the *sheen* got filled
   white over the whole wheel — were **structural/interaction** bugs that 41 unit
   tests didn't catch. We need (a) hit-testing / pointer-events assertions, and
   (b) **id-based SVG selectors everywhere** (no positional indexing).
3. **`!important` still high (151).** Not "competing layers" anymore, but it makes the
   cascade hard to reason about. The bubble + popover layers are the densest.
4. **Animation budget.** ~8 always-on animations (breath, sheen, tonic pulse, best
   pulse, arrow flow, gravity, plasma loop) + View-Transition theme wipe. Fine on
   desktop; needs a real low-end-mobile FPS pass and a global "pause when hidden".
5. **Version is duplicated** (`APP_VERSION` + `<title>` + badge) — should be one source.
6. **Production tab** is still a parallel mode that risks competing with the harmony
   core; it has the least test coverage.
7. **Suggestion engine** still leans on hand-tuned weights; good, but genre/emotional
   context and longer look-ahead are not yet modelled.

## 5. Bugs found & fixed in this pass

- ✅ **Invisible overlay wall (mobile):** closed explanation banners kept
  `pointer-events:auto`; top bar (theme/language/tabs) and wheel top were unclickable.
  → cards are now non-interactive unless the guide is open.
- ✅ **Whitish fog over the wheel:** the new `#wheelSheen` circle shifted SVG indices,
  so the centre-disc fill landed on the sheen (78% white disc, r=286). → target the
  centre disc by `#centerDisc`, force `#wheelSheen { fill:none }`.
- ✅ **Flat / monochrome background:** shader mixed the 3rd colour globally and the
  default palette was three near-identical oranges. → 3-field shader, brighter,
  3 distinct hues per palette.
- ✅ **Builder pills overlapped:** absolutely-positioned tools sat on top of the chord /
  degree / index. → tools moved in-flow after a divider.
- ◻️ **Major/Minor toggle** reported as "not updating" — verified correct in code
  (class + accent bg switch on `setWheelView`); most likely a stale Pages cache.

## 6. Architecture verdict

The layered model from the old audit is in place and healthy:

| Layer | State |
|---|---|
| DATA (constants, theory-data, i18n) | ✅ no DOM access |
| STATE (`st`, AppModel) | ✅ single source of truth |
| ACTIONS (ActionDispatcher) | ✅ all interactions route through dispatch |
| ENGINES (theory / harmony / suggestion) | ✅ mostly pure logic |
| RENDER (render-engine + renderers) | ⚠️ a few SVG positional selectors to harden |
| INTERACTIONS (wheel / builder / mobile) | ⚠️ needs pointer-events/hit-test tests |
| OVERLAYS (OverlayManager) | ✅ one contract; should also own pointer-events |
| TESTS (EFC_DEV) | ✅ strong unit base; ⚠️ no interaction/DOM-hit tests |

---

## 7. Roadmap

### Near-term hardening (do first — cheap, high trust)
- **H1 · Audio preview (Web Audio).** Play a chord on tap and play-through the
  progression with a transport. *This is the highest-value single feature.*
- **H2 · Interaction guard tests.** `EFC_DEV` checks that assert: no element with
  `pointer-events:auto` covers the top bar while closed; key controls are hit-testable;
  the wheel's top sector is clickable. (Would have caught the overlay + sheen bugs.)
- **H3 · SVG selector audit.** Replace every positional `querySelectorAll(...)[n]` on
  the wheel with ids. Add a test that the centre disc / bg are addressed by id.
- **H4 · Single version source** + a "pause all idle animation when tab hidden /
  `prefers-reduced-motion`" switch, and a low-end mobile FPS pass.

### V4.1 — Sound & feel
- Web Audio synth (simple, pleasant) for chords, scale notes, and progression playback,
  synced with the existing pill "playhead" idea and the MIDI grid in Production.

### V4.2 — Genre-aware suggestions
- House / neo-soul / disco / ambient / cinematic bias the suggestion scoring and the
  reasons (the engine already has the hooks: `curGenre`, mood lens).

### V4.3 — Progression narrative V2
- Turn a sequence into a small story (beginning · lift · tension · release · home),
  surfaced as one short line + the harmonic-gravity arcs already drawn.

### V4.4 — Export / Share
- Copy progression, shareable URL (state in the hash), MIDI export, save/load sessions
  to `localStorage`.

### V4.5 — Real-device mobile pass
- Manual QA on iOS Safari / Android Chrome: wheel drag vs page scroll, the View-
  Transition theme wipe, the explanation banners, and the animation FPS.

### V5.0 — Platform
- PWA (installable, offline), and optionally a tiny test runner in CI so
  `EFC_DEV.runTests()` gates every deploy.

---

## 8. One-line recommendation

**Add sound (V4.1) and interaction-guard tests (H2) next.** The tool already looks and
feels alive; the next leap in trust is *hearing* what you build and making sure the
moving parts can't silently block each other.
