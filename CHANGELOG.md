# Easy Fifth Circle — Changelog

## V3.20 — CSS De-override Pass (Audit §8.3)

**Release date:** 2026-06-03

- Verified duplicates: the modular split already cut duplicate selector groups
  from ~126 (old single file) to a handful of real ones; the rest are
  legitimate responsive overrides (layout + mobile layers).
- Removed a redundant `@media (max-width:560px)` block that only re-applied a
  value already set at 860px.
- Merged `.info-row` (was split across `layout.css` and `popovers.css`) into a
  single canonical rule.
- Dropped 11 unnecessary `!important` from `.next-orbit` (verified the
  more-specific mobile/`body.light` rules still win) — 154 → 143 in source.
- New `EFC_DEV.cssHealth()` diagnostic (rule count + !important density) in
  `report()`, so the visual system stays measurable across versions.

## Circle-of-Fifths explanation panels

- Replaced the single info dropdown with positioned panels around the wheel:
  intro (what/why + parts legend), Fourths (left), Fifths (right), each
  explaining a direction musically. Desktop positions them around the wheel;
  mobile stacks them in a scrollable column. EN/ES.

## V3.19 — Suggestion Engine Validation (Audit §6)

**Release date:** 2026-06-03

- Suggestion engine now has **memory**: reads the built progression for
  cadences in progress and pulls toward their target (ii–V→I, IV–V→I,
  ♭VI–♭VII→i, V→I, mixolydian ♭VII→I).
- **Repetition/vamp recognition** — repeated chords are treated as a loop
  ("keeps the loop open") with IV/V/vi offered as clean exits.
- **Modal signature boost** so modes sound modal (mixo ♭VII, dorian IV,
  phrygian ♭II, lydian II, aeolian ♭VI/♭VII).
- **Position awareness** — a progression no longer "opens" by sitting on I.
- **Self-explaining reasons** ("Completes ii–V–I", "Strong resolution",
  "Keeps the loop open", "Adds darker colour") shown in the header hint and
  per-bubble tooltip (on-demand).
- **+12 validation tests** in `EFC_DEV` (32 total, all green).

## V3.18 — Mobile QA Pass (Audit §10)

**Release date:** 2026-06-03

- Pills row and bubble row use `touch-action:pan-x` + `overscroll-behavior-x`
  so horizontal swipes scroll the row and vertical swipes scroll the page.
- Mobile bubbles keep their size difference with a tappable 56px floor.
- Piano/guitar drawers collapse by default on mobile.
- Plasma background renders at 0.6× resolution, dimmed 0.72× on mobile.
- New `EFC_DEV.mobileCheck()` smoke test (9 checks) + dev-panel "Mobile check"
  button, included in `report()`.

## V3.17 — Architecture + Wheel Direction Guide

**Release date:** 2026-06-02

### What changed

#### Architecture
- Extracted entire app into a modular `src/` directory structure (~25 JS modules, 11 CSS layers)
- Created `build.js` — a simple Node script that assembles `dist/Easy_Fifth_Circle.html` from source modules
- No bundler required: modules are concatenated in dependency order and injected into a clean HTML template
- All CSS consolidated into stable layers (tokens → base → layout → wheel → degrees → builder → suggestions → popovers → instruments → production → mobile)

#### New feature: Wheel Direction Guide
- Info button (`ⓘ`) added to the SVG wheel (top-right, non-interfering)
- On click: two subtle dashed arcs appear on either side of the wheel
  - Right arc: **FIFTHS** (clockwise)
  - Left arc: **FOURTHS** (counterclockwise)
- Arcs animate in with a smooth opacity transition
- Popover explains the reading directions in English and Spanish
- Light/dark theme aware; does not cover chord names or interfere with drag

#### Bug fixes
- **Duplicate `id="wheelPointer"`** eliminated — HTML template has exactly one; the JS fallback assignment removed
- **`relativeMajorFromMinor`** fixed — now correctly handles both 'A' and 'Am' input formats
- **Mode dropdown** reliably portals to `document.body` and sits above all cards; single authoritative implementation replaces layered V3.x patches
- **Progression pills** — only the newly added pill animates; re-renders don't retrigger all pills

#### Tests
- All 20 tests pass (`EFC_DEV.runTests()`)
- Added `EFC_DEV.report()` returning version, module list, duplicate-ID check, state, and test results
- Fixed test for A minor scale and D Dorian (were using wrong `wheelView` causing `normalizeKeyState` to remap the key)

### Source module breakdown

| Path | Responsibility |
|------|---------------|
| `src/core/constants.js` | Notes, modes, degree data, palette config — pure data |
| `src/core/state.js` | `st` — single mutable state object, load/save |
| `src/core/actions.js` | `ActionDispatcher`, `AppActions` — all interactions route here |
| `src/core/utils.js` | Scale/chord helpers, SVG utils (`polar`, `se`), `normalizeKeyState` |
| `src/core/init.js` | Plasma WebGL, theme toggle, app bootstrap IIFE |
| `src/i18n/en.js` + `es.js` | Localization strings |
| `src/i18n/i18n.js` | `t()`, `applyI18n()`, `setLanguage()` |
| `src/theory/theory-data.js` | `THEORY_DATA`, `PRODUCTION_DATA`, lookup helpers |
| `src/theory/harmony-engine.js` | Gravity archetypes, mood profiles, transition scoring |
| `src/theory/suggestion-engine.js` | `SuggestionEngine` — generates next-chord candidates |
| `src/theory/wheel-direction-engine.js` | **NEW** — Fifths/Fourths arc guide + info popover |
| `src/ui/render-engine.js` | `RenderEngine` — orchestrates full/partial renders |
| `src/ui/wheel-renderer.js` | SVG wheel draw + rotation animation |
| `src/ui/theory-renderer.js` | Degrees row, side cards, scale chips |
| `src/ui/builder-renderer.js` | `HistoryEngine`, `BuilderEngine`, progression pills |
| `src/ui/suggestions-renderer.js` | Klimper-style weighted bubbles, metric bars |
| `src/ui/instruments-renderer.js` | Piano and guitar/fretboard |
| `src/ui/popover-manager.js` | Degree popup, micro-popovers, swipe navigation |
| `src/ui/mode-selector.js` | `ModeMenu` — portaled custom dropdown |
| `src/ui/tabs.js` | Tab switching, production panel, rhythm grid player |
| `src/interactions/wheel-interaction.js` | Drag-roulette, snap-to-key, pointer handling |
| `src/interactions/builder-interaction.js` | `DegreeDrag`, chord-to-builder animation |
| `src/interactions/mobile-optimizer.js` | `InteractionController`, `MobileOptimizer` |
| `src/dev/tests.js` | `EFC_DEV` — stability checks, dev panel, `report()` |

---

## V3.16 — Stability Pass 1
Added `ActionDispatcher`, `RenderEngine`, `AppModel`, duplicate-ID detection, dev panel.

## V3.15 — CSS/UI System Consolidation
Consolidated version-patch CSS layers into a single active overlay contract.

## V3.13 — Wheel Typography + Visual Hierarchy
Serif wheel labels, stronger bubble size contrast, cleaner builder copy.

## V3.11 — True Weighted Suggestion Bubbles
Real size variation by fit score, scroll-snap orbit, bubble enter animation.

## V3.10 — Klimper-style Next Moves in Builder
Suggestion bubbles moved inside progression builder, old card grid hidden.

## V3.8 — Harmonic Intelligence Polish
Mood profiles, gravity archetypes, R/T/M metrics.

## V3.4 — Progression Builder V2
Builder pills, drag-reorder, progression narrative, story grid.

## V3.2 — Progression Builder V1 + Cleaner Popovers
Flow section replaced by builder; popover contract started.

## V3.0 — Harmonic Gravity
Harmonic gravity status cards, transition profiles, mood buttons.

## V2.8 — Compact Degree Popup
Floating popup replaces inline panel, swipe navigation.

## V1.7 — Creative Suggestions
First suggestion cards with "why" text.

## V1.0 — Initial prototype
Circle of Fifths wheel, major/minor toggle, scale display.
