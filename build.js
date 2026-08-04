#!/usr/bin/env node
// ── Quinta — build script ─────────────────
// node build.js  →  dist/Quinta.html
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
  // Event delegation + the action registry (V6.18) — replaces inline handlers
  'src/core/actions-registry.js',
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
  // Comeback panel — uses Library, PROG_PRESETS, GENRES at runtime
  'src/ui/comeback.js',
  // Inspector (V2 · B1) — one panel that follows the selection
  'src/ui/inspector.js',
  // Document (B2) + rhythm track (B3)
  'src/ui/document.js',
  'src/ui/rhythm.js',
  // The data-act → function map. Lambdas, so targets resolve at call time.
  'src/ui/actions-map.js',
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

// `node build.js --v2` emits the SAME sources into /v2/ instead of the root.
// The point is deployment isolation, not a code fork: /v2/ gets its own manifest
// and service worker, so it installs as a SEPARATE PWA. Anyone who already has
// Quinta on their home screen keeps V1 untouched while V2 is being reshaped —
// there is no rollback with a service worker, only rolling forward, so the safe
// move is never to touch the root until the new version has won.
const V2 = process.argv.includes('--v2');
const V2DIR = path.join(ROOT, 'v2');

function build() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
  if (V2 && !fs.existsSync(V2DIR)) fs.mkdirSync(V2DIR, { recursive: true });

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

  if (V2) {
    // Samples live at the repo root; /v2/ points one level up instead of
    // duplicating 9.5MB. They are fetched, not precached — the v2 service worker
    // cannot cache outside its own scope, so v2 needs a connection for real
    // instrument sounds until it is promoted to the root.
    const v2out = out
      .replace(/(["'`(])samples\//g, '$1../samples/')
      // Icons live at the root too — same reason as samples: don't duplicate.
      .replace(/(["'`(=])icons\//g, '$1../icons/')
      .replace(/href="\.\.\/icons\//g, 'href="../icons/')
      .replace('<title>Quinta', '<title>Quinta V2 · ');
    fs.writeFileSync(path.join(V2DIR, 'index.html'), v2out, 'utf8');
    fs.writeFileSync(path.join(V2DIR, 'manifest.webmanifest'), JSON.stringify({
      name: 'Quinta V2', short_name: 'Quinta V2',
      start_url: './index.html', scope: './', display: 'standalone',
      background_color: '#0a0a0b', theme_color: '#0a0a0b',
      icons: [{ src: '../icons/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '../icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    }, null, 2), 'utf8');
    // Cache-bust on the VERSION, not the date: three deploys landed on
    // 2026-07-29 and all three shared one cache bucket. The SW is network-first
    // so nobody online was ever stuck, but an offline install would have kept
    // whichever build it happened to see first that day.
    const APP_VER = (fs.readFileSync('src/core/constants.js', 'utf8')
      .match(/APP_VERSION\s*=\s*'([^']+)'/) || [, 'dev'])[1].replace(/[^\w.]/g, '').toLowerCase();
    // Minimal SW: scope /v2/, caches only its own shell. No samples (out of scope).
    fs.writeFileSync(path.join(V2DIR, 'sw.js'),
`// Quinta V2 — isolated shell cache. Scope is /v2/, so it can never touch the
// V1 install at the root. Samples are fetched from ../samples/ and NOT cached:
// they are outside this scope by design.
const CACHE = 'quinta-v2-${APP_VER}';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('quinta-v2-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const c = r.clone();
    caches.open(CACHE).then(cache => { try { cache.put(e.request, c); } catch (_) {} });
    return r;
  }).catch(() => caches.match(e.request)));
});
`, 'utf8');
    const kb2 = Math.round(Buffer.byteLength(v2out) / 1024);
    console.log(`\n✓  v2/index.html  (${kb2} KB) — PWA aparte, scope /v2/`);
    return;                       // --v2 never writes the root
  }

  const dest = path.join(DIST, 'Quinta.html');
  fs.writeFileSync(dest, out, 'utf8');

  // Also emit index.html at the repo root so GitHub Pages serves the current
  // build straight from the main branch.
  fs.writeFileSync(path.join(ROOT, 'index.html'), out, 'utf8');

  // Copy PWA assets next to the standalone build so dist/ is self-contained
  // (the root already has them for GitHub Pages).
  try {
    fs.copyFileSync(path.join(ROOT, 'manifest.webmanifest'), path.join(DIST, 'manifest.webmanifest'));
    fs.copyFileSync(path.join(ROOT, 'sw.js'), path.join(DIST, 'sw.js'));
    fs.copyFileSync(path.join(ROOT, 'privacy.html'), path.join(DIST, 'privacy.html'));
    fs.copyFileSync(path.join(DIST, 'Quinta.html'), path.join(DIST, 'index.html'));
    const distIcons = path.join(DIST, 'icons');
    if (!fs.existsSync(distIcons)) fs.mkdirSync(distIcons);
    for (const f of fs.readdirSync(path.join(ROOT, 'icons'))) {
      fs.copyFileSync(path.join(ROOT, 'icons', f), path.join(distIcons, f));
    }
  } catch (_) { /* PWA assets optional */ }

  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`\n✓  dist/Quinta.html  (${kb} KB)`);
  console.log(`✓  index.html  (GitHub Pages entry)`);
}

console.log('\nQuinta — building...\n');
try {
  build();
} catch (err) {
  console.error('\n✗  Build failed:', err.message);
  process.exit(1);
}
