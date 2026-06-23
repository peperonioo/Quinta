# Claude Design prompt — Quinta's living background, leveled up

> Paste into Claude Design (interactive module).

---

Build an **interactive, full-screen animated background** (a WebGL fragment shader
on a `<canvas>`) for **Quinta** — a music-theory app built around the circle of
fifths. Vibe: dark, premium, "liquid-gel," alive but never distracting (the UI
sits on top of it).

**What exists today (keep the soul, improve the execution):**
- A full-screen WebGL "plasma". A fragment shader mixes **3** palette colours with
  a few `sin()` fields that slowly drift over time — gentle flowing colour.
- Base background ≈ `#0a0a0b`. There are 4 swappable 3-colour palettes + an
  intensity slider. The UI accent is a coral-orange `#e8441a`.
- It looks good but a little flat/smooth — same gradient everywhere.

**Level it up:**
1. **Organic flow, not smooth gradients** — replace the simple `sin` mix with
   **domain-warped fBm noise** (2–3 octaves). The colour should move in slow
   liquid swirls and tendrils, hypnotic and continuous.
2. **More colour at once** — blend **4–5 colour stops** across the field so the
   whole screen has depth and variety simultaneously, with smooth seams.
3. **Interactive** — the field reacts to pointer/touch: the warp bends gently
   **toward the cursor** (a soft gravitational pull / parallax), and a **tap
   sends a subtle ripple** outward. It's a music app — the background should feel
   like it "responds."
4. **A unique, ownable signature palette** — propose ONE distinctive Quinta
   palette (not generic purple). Riff to start from: deep **plum/indigo** base →
   **magenta** → **electric coral** (near the brand `#ff5a3c`) → a warm **amber**
   highlight, with a thin band of **teal/cyan** for contrast pop. Premium,
   unmistakably "Quinta."
5. **Polish** — subtle film grain / dither to kill banding; a soft vignette so
   white & coral UI stays readable on top; keep it dark enough for contrast.
6. **Performance** — smooth full-screen; mobile ~30fps; pause while scrolling or
   when the tab is hidden.

**Deliverable:** one self-contained interactive HTML file (canvas + WebGL shader +
pointer handlers) I can drop straight into the app, **plus the raw GLSL** so it's
tweakable. Show **2–3 palette variations** of the signature direction.

_Context: brand accent `#e8441a`/`#ff7048`; fonts DM Serif Display / DM Sans /
DM Mono; the app is the circle of fifths, alive._
