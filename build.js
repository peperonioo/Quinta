#!/usr/bin/env node
// ── Easy Fifth Circle — build script ─────────────────
// node build.js  →  dist/Easy_Fifth_Circle.html
//
// Reads src/template.html, injects all CSS and JS,
// writes a self-contained standalone HTML file.

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// Minify with esbuild when available. IMPORTANT: identifiers are NOT mangled —
// the inline on* handlers in the HTML call global function names by string, so
// renaming them would break the app. We only strip whitespace + simplify syntax.
const NO_MIN  = process.argv.includes('--no-min') || process.env.NO_MIN === '1';
const esbuild = (() => { try { return NO_MIN ? null : require('esbuild'); } catch { return null; } })();
function minifyJS(code) {
  if (!esbuild) return code;
  try { return esbuild.transformSync(code, { loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, legalComments: 'none', target: 'es2019' }).code; }
  catch (e) { console.warn('  JS minify skipped:', e.message); return code; }
}
function minifyCSS(code) {
  if (!esbuild) return code;
  try { return esbuild.transformSync(code, { loader: 'css', minify: true, legalComments: 'none' }).code; }
  catch (e) { console.warn('  CSS minify skipped:', e.message); return code; }
}

// ── CSS files in layer order ────────────────────────
const CSS_FILES = [
  'src/styles/tokens.css',
  'src/styles/base.css',
  'src/styles/layout.css',
  'src/styles/wheel.css',
  'src/styles/degrees.css',
  'src/styles/builder.css',
  'src/styles/suggestions.css',
  'src/styles/popovers.css',
  'src/styles/instruments.css',
  'src/styles/onboarding.css',
  'src/styles/production.css',
  'src/styles/components.css',
  'src/styles/typography.css',
  'src/styles/mobile.css',
  'src/styles/transport-sheet.css',
];

// ── JS files in dependency order ─────────────────────
// Rule: a file can only use globals defined by files that come before it
// in the list (at module-level / load-time). Function bodies may reference
// globals defined later (resolved at call time, not at load time).
const JS_FILES = [
  // Pure data — no dependencies
  'src/core/constants.js',
  // Localisation strings
  'src/i18n/en.js',
  'src/i18n/es.js',
  'src/i18n/i18n.js',
  'src/ui/icons.js',
  // More static data
  'src/theory/theory-data.js',
  // State — uses constants.js (defaultState, STORAGE_KEY)
  'src/core/state.js',
  // Telemetry (opt-in event layer; no-op until an endpoint is set)
  'src/core/telemetry.js',
  // Pure helpers — uses state (at runtime only), constants
  'src/core/utils.js',
  // Audio engine (Web Audio synth) — uses utils at runtime
  'src/core/audio-engine.js',
  // MIDI export + shareable-link state — uses audio-engine helpers at runtime
  'src/core/export-share.js',
  // Harmony logic — pure, uses state/utils at runtime
  'src/theory/harmony-engine.js',
  'src/theory/suggestion-engine.js',
  // New: wheel direction guide
  'src/theory/wheel-direction-engine.js',
  // Interaction controller (used by mobile-optimizer and wheel-interaction)
  'src/interactions/mobile-optimizer.js',
  // Render orchestrator — calls other renderers at runtime
  'src/ui/render-engine.js',
  // Individual renderers
  'src/ui/wheel-renderer.js',
  'src/ui/popover-manager.js',
  'src/ui/mode-selector.js',
  'src/ui/theory-renderer.js',
  'src/ui/builder-renderer.js',
  'src/ui/suggestions-renderer.js',
  'src/ui/bubble-physics.js',
  'src/ui/chord-variants.js',
  'src/ui/library.js',
  'src/ui/guitar-shapes.js',
  'src/ui/instruments-renderer.js',
  'src/ui/metronome.js',
  'src/ui/emotion-suggester.js',
  'src/ui/color-chords.js',
  'src/ui/transport-sheet.js',
  'src/ui/settings.js',
  'src/ui/onboarding.js',
  'src/ui/tabs.js',
  // Interactions
  'src/interactions/wheel-interaction.js',
  'src/interactions/builder-interaction.js',
  // Actions dispatcher (calls renderers at runtime — order OK)
  'src/core/actions.js',
  // Plasma + theme + init IIFE (runs after all above are defined)
  'src/core/init.js',
  // Dev panel (runs after everything else)
  'src/dev/tests.js',
];

function readFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.warn(`  MISSING: ${rel}`);
    return `/* ${rel} not found */\n`;
  }
  return fs.readFileSync(full, 'utf8');
}

function build() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

  // Assemble CSS
  const cssChunks = CSS_FILES.map(f => {
    console.log(`  css  ${f}`);
    return `/* == ${path.basename(f)} == */\n` + readFile(f);
  });
  const css = `<style>${minifyCSS(cssChunks.join('\n'))}</style>`;

  // Assemble JS
  const jsChunks = JS_FILES.map(f => {
    console.log(`  js   ${f}`);
    return `// == ${path.basename(f)} ==\n` + readFile(f);
  });
  const js = `<script>'use strict';\n${minifyJS(jsChunks.join('\n\n'))}</script>`;

  // Inject into template
  const template = readFile('src/template.html');
  let out = template
    .replace('<!-- %%CSS%% -->', css)
    .replace('<!-- %%JS%% -->',  js);

  const dest = path.join(DIST, 'Easy_Fifth_Circle.html');
  fs.writeFileSync(dest, out, 'utf8');

  // Also emit index.html at the repo root so GitHub Pages serves the current
  // build straight from the main branch.
  fs.writeFileSync(path.join(ROOT, 'index.html'), out, 'utf8');

  // Copy PWA assets next to the standalone build so dist/ is self-contained
  // (the root already has them for GitHub Pages).
  try {
    fs.copyFileSync(path.join(ROOT, 'manifest.webmanifest'), path.join(DIST, 'manifest.webmanifest'));
    fs.copyFileSync(path.join(ROOT, 'sw.js'), path.join(DIST, 'sw.js'));
    fs.copyFileSync(path.join(DIST, 'Easy_Fifth_Circle.html'), path.join(DIST, 'index.html'));
    const distIcons = path.join(DIST, 'icons');
    if (!fs.existsSync(distIcons)) fs.mkdirSync(distIcons);
    for (const f of fs.readdirSync(path.join(ROOT, 'icons'))) {
      fs.copyFileSync(path.join(ROOT, 'icons', f), path.join(distIcons, f));
    }
  } catch (_) { /* PWA assets optional */ }

  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`\n✓  dist/Easy_Fifth_Circle.html  (${kb} KB)`);
  console.log(`✓  index.html  (GitHub Pages entry)`);
}

console.log('\nEasy Fifth Circle — building...\n');
try {
  build();
} catch (err) {
  console.error('\n✗  Build failed:', err.message);
  process.exit(1);
}
