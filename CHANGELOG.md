# Easy Fifth Circle — Changelog

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
