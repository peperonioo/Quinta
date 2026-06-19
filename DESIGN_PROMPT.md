# Prompt para Claude Design — Easy Fifth Circle (consolidación de UI + marca)

*(Pegar tal cual. Está en inglés porque rinde mejor con herramientas de diseño; cambia el idioma si lo prefieres.)*

---

You are a senior product designer. I have a working music app and I need you to
**consolidate its UI into one cohesive design system** and design its **brand layer**.
This is NOT a redesign from scratch — the visual identity already exists and is strong.
Preserve it; just lock it, unify it, and remove the inconsistency that crept in as
features were added.

## The product
**Easy Fifth Circle** — an interactive harmony / songwriting tool for musicians and
producers. A living circle of fifths: pick a key and mode, build chord progressions,
hear them on a built-in synth (Rhodes, nylon guitar, 808/909 drums), see them on a
piano and guitar fretboard, export to MIDI. It's an installable PWA, mobile-first,
with dark and light themes.

## Identity to PRESERVE (this is the anchor — do not reinvent)
- **Typography — the DM family (Google Fonts), which all coexist:**
  - `DM Serif Display` → display: wheel labels, chord names, big numbers, titles.
  - `DM Mono` → data/labels: BPM, metrics, captions, fret numbers.
  - `DM Sans` → body and buttons.
- **Color (dark default + light variant):**
  - bg `#0a0a0b` · ink `#f0ede8` · muted `rgba(240,237,232,.52)`
  - accent `#e8441a` · accent-light `#ff7048` (orange = action / selection)
  - A **plasma accent** that follows an animated WebGL plasma background. 4 palettes:
    Cosmos `#ff8a3d/#ff2e63/#7b2ff7`, Aurora `#00e0b8/#2a7bff/#9b3cff`,
    Dusk `#ff5fa2/#a64bff/#ffb347`, Amber `#ffd24a/#ff7a1a/#ff2e6e`.
    "Living" UI (suggestion bubbles, highlights, wheel pips) tint with the plasma
    accent; actions/selection use the fixed orange.
- **Tokens:** radii 8 / 14 / 18 / 999px · ease `cubic-bezier(.22,1,.36,1)` ·
  durations 160 / 320 / 620ms · soft + lifted shadows · 44px tap targets · safe-area.
- **Aesthetic:** animated plasma background + "liquid-gel" frosted-glass surfaces
  (gloss, living specular highlights). Premium, tactile, musical.

## The problem to fix (drift)
As features grew, the UI fragmented:
- **~13 different button/control recipes** (`builder-btn`, `tab-btn`, `wheel-toggle`,
  `instr-dock-btn`, `ms-btn`, `gss-seg`, `cv-chip`, `genre-btn`, `mood-btn`,
  `metro-step`, `gss-btn`, `gsc-arrow`, `metro-sounds`) that should be ONE system.
- **Mixed iconography**: emoji (📚 🔗 ↓ ▶ ⏱ ◇ ☀ ♩ ⬡) alongside SVG glyphs and text.
- **Inconsistent glass / elevation** across cards, overlays, the onboarding and the dock.
- **Accent used inconsistently** (hardcoded orange vs the plasma accent).

## What I want you to deliver

### 1. A locked design system
- A clean token set: a type scale (display / title / body / label / mono sizes), a
  spacing scale, 2–3 glass elevation levels, and semantic color roles.
- A **component kit**, one canonical recipe each with all states (default / hover /
  active / focus / disabled), in dark AND light:
  **Button** (primary / ghost / danger), **Pill**, **Segmented control** (ONE
  component for: the Theory/Production tabs, the Major/Minor toggle, Chords|Triads,
  the metronome-sound picker, the genre tabs), **Chip**, **Card/Surface** (the glass
  recipe at each elevation), **Floating island/overlay**, **Dot/indicator/slider**.

### 2. A line-SVG icon set (NO emoji)
One consistent style and stroke weight, replacing every emoji: library, share,
download/MIDI, play/stop, count-in (metronome), voicing, theme (sun/moon), mode,
chord-shapes, piano, guitar, plus the small UI glyphs (chevrons, close, arrows).

### 3. A few key screens re-laid-out with the system (mobile + desktop)
Show the system applied: the **wheel/home** screen, the **progression builder +
suggestions**, the **instruments (piano/guitar + shape cards)**, and the
**onboarding**. Keep the existing structure and UX — just make it visually coherent.

### 4. Brand layer
- **Name**: I'm choosing between **Cyrcle**, **Tonic**, **Prism** (open to better).
- **App icon** (1024px): the circle of fifths + plasma + orange, recognisable at 48px.
- **Wordmark / logotype** using the DM family.
- A **landing page** design (hero with the living wheel, feature sections, download CTA,
  email capture) and **App Store / Play screenshot templates** (6–8 frames with copy).

## Rules
1. Don't reinvent the identity — DM type, plasma, liquid-gel, orange. Consolidate.
2. One component per function. If two things do the same job, they're the same component.
3. Plasma accent for "living" elements; fixed orange for actions/selection. No hardcoded hex in components.
4. Line-SVG icons, never emoji.
5. Everything references tokens — no magic values.
6. Mobile-first (safe-area, 44px targets, one-handed). Light and dark equally polished.
7. Respect reduced-motion.

## The goal
The result should feel like **one finished premium product**, not a pile of features.
Deliver the tokens, the component kit, the icon set, the key screens, and the brand
assets — all in the existing visual language, just solidified.
