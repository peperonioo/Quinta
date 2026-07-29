// Headless control smoke test (V6.20).
//
// EFC_DEV.runTests() checks logic and structure. It cannot check that a CONTROL
// still does what it says — and V6.18/V6.19 moved every handler in the app to
// event delegation, a change that broke clip dragging silently while the suite
// stayed green. This drives real browser clicks through the main controls and
// asserts an observable effect on `st` or the DOM for each one.
//
// Kept separate from ci-tests.mjs on purpose: that one runs in-page assertions,
// this one needs Playwright to synthesise input.

import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const FILE = pathToFileURL(path.resolve('dist/index.html')).href;
const launchOpts = { headless: true };
if (process.env.PW_EXECUTABLE_PATH) launchOpts.executablePath = process.env.PW_EXECUTABLE_PATH;
else if (process.env.PW_CHANNEL)    launchOpts.channel = process.env.PW_CHANNEL;

// [name, selector, predicate evaluated in the page, optional setup]
// [name, selector, predicate, optional setup]. `setup` also switches mode:
// after V6.22 a control only exists in its own mode.
const M = m => `(() => switchTab('${m}'))()`;
const CASES = [
  ['settings.toggle',  '#settingsBtn',                                    () => !document.getElementById('settingsSheet').hidden],
  ['set.theme light',  '[data-act="set.theme"][data-id="light"]',         () => document.body.classList.contains('light')],
  ['set.theme dark',   '[data-act="set.theme"][data-id="dark"]',          () => !document.body.classList.contains('light')],
  ['settings.close',   '.settings-sheet .mod-x',                          () => document.getElementById('settingsSheet').hidden],
  ['view.set minor',   '[data-act="view.set"][data-id="minor"]',          () => st.wheelView === 'minor', () => switchTab('explore')],
  ['view.set major',   '[data-act="view.set"][data-id="major"]',          () => st.wheelView === 'major'],
  ['builder.surprise', '[data-act="builder.surprise"]',                   () => (st.history || []).length > 0, () => switchTab('build')],
  ['prog.loop',        '#loopBtn',                                        () => st.loop === true],
  ['prog.chain',       '#chainBtn',                                       () => st.chain === true],
  ['builder.more',     '#moreBtn',                                        () => !document.getElementById('builderMore').hasAttribute('hidden')],
  ['play.opt countIn', '[data-act="play.opt"][data-id="countIn"]',        () => st.countIn === true],
  ['builder.snap',     '#snapBtn',                                        () => st.snap !== 0.25],
  ['section.go B',     '[data-act="section.go"][data-id="B"]',            () => st.activeSection === 'B'],
  ['section.go A',     '[data-act="section.go"][data-id="A"]',            () => st.activeSection === 'A'],
  ['export.open',      '#exportBtn',                                      () => !document.getElementById('builderMore').hasAttribute('hidden')],
  ['lib.toggle',       '[data-act="lib.toggle"]',                         () => Library.open === true, () => switchTab('build')],
  ['lib.close',        '.lib-close',                                      () => Library.open === false],
  ['emotion.toggle',   '[data-act="emotion.toggle"]',                     () => EmotionSuggester.isOpen(), () => switchTab('explore')],
  ['emotion.select',   '.em-chip',                                        () => !!document.querySelector('.em-chip.on')],
  ['emotion.close',    '#emotionPanel .mod-x',                            () => !EmotionSuggester.isOpen()],
  ['color.toggle',     '.card-action-btn[data-act="color.toggle"]',       () => !document.getElementById('colorPanel').hidden, () => switchTab('explore')],
  ['color.close',      '#colorPanel .mod-x',                              () => document.getElementById('colorPanel').hidden],
  ['dirguide on',      '#wheelInfoBtn',                                   () => WheelDirectionGuide.visible === true, () => switchTab('explore')],
  ['dirguide off',     '#wheelInfoBtn',                                   () => WheelDirectionGuide.visible === false],
  ['metro.panel',      '.metro-pill',                                     () => document.getElementById('metronome').classList.contains('open')],
  ['metro.faster',     '[data-act="metro.faster"]',                       () => st.bpm > 100],
  ['metro.sound',      '[data-act="metro.sound"][data-id="rimshot"]',     () => st.metroSound === 'rimshot'],
  // Voices moved into the inspector (they were the only thing keeping the dock
  // alive). Reaching them now needs a selected chord.
  ['insp.voice epiano','[data-act="insp.voice"][data-id="epiano"]',       () => st.pianoSound === 'epiano',
    () => { switchTab('build'); if (!(st.history||[]).length) surpriseMe(); Inspector.select(0); Inspector.setInstrument('piano'); }],
  ['insp.voice acústica','[data-act="insp.voice"][data-id="steel"]',      () => st.pianoSound === 'steel',
    () => { Inspector.setInstrument('guitar'); }],
  // B3: Produce is no longer a mode. Its controls live in the rhythm track.
  ['rhythm.toggle on', '[data-act="rhythm.toggle"]',                      () => st.rhythmOn === true, () => switchTab('build')],
  ['rhythm.genre jazz','[data-act="rhythm.genre"][data-id="jazz"]',       () => st.genre === 'jazz'],
  ['grid.toggle',      '#s-1-2',                                          () => !!(st.userPatterns && st.userPatterns[curGenre])],
  ['rhythm.toggle off','[data-act="rhythm.toggle"]',                      () => st.rhythmOn === false],
  // B2: the document header
  ['doc.save',         '[data-act="doc.save"]',                           () => !!st.docId,
    () => { switchTab('build'); if (!(st.history||[]).length) surpriseMe(); }],
  ['ctx.key → explore','[data-act="ctx.key"]',                            () => document.body.dataset.mode === 'explore', () => switchTab('build')],
  // Tapping a chord must show its variations WITHOUT scrolling. This regressed
  // once (the inspector sat 628px down an 844px screen, so only its header
  // showed) and was reported as "se quitó lo de las séptimas y novenas".
  ['chord tap → variations', '.builder-step',                             () => {
      const v = [...document.querySelectorAll('.insp-var')];
      return v.length >= 6 && v.every(x => { const r = x.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight; });
    }, () => { switchTab('build'); if (!(st.history||[]).length) surpriseMe(); }],
  // The wheel WRITES (V2). Tapping an in-key sector appends that chord instead of
  // only sounding it — the product is named after this thing and for six versions
  // it could not put a single chord into a progression.
  ['wheel adds a chord', '#wg > g',                                       () => (st.history || []).length > 0,
    () => { switchTab('explore'); HistoryEngine.clear(); }],
  ['builder.clear',    '[data-act="builder.clear"]',                      () => (st.history || []).length === 0,
    () => { switchTab('build'); const m = document.getElementById('builderMore'); if (m.hasAttribute('hidden')) document.getElementById('moreBtn').click(); }],
];

const browser = await chromium.launch(launchOpts);
let failed = 0, skipped = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  const unknownActions = [];
  page.on('console', m => { if (/\[action\] unknown/.test(m.text())) unknownActions.push(m.text()); });

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ActionRegistry === 'object', null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  // Boot chrome must not eat the clicks.
  await page.evaluate(() => {
    try { document.getElementById('splash')?.remove(); } catch (_) {}
    try { if (typeof Onboarding === 'object') Onboarding.close(); } catch (_) {}
    try { if (typeof Comeback === 'object') Comeback.close(); } catch (_) {}
  });
  await page.waitForTimeout(400);

  // Every data-act in the DOM must resolve to a registered action.
  const uncovered = await page.evaluate(() => {
    const declared = new Set();
    document.querySelectorAll('[data-act],[data-act-down],[data-act-key],[data-act-enter]').forEach(el => {
      ['act', 'actDown', 'actKey', 'actEnter'].forEach(k => { if (el.dataset[k]) declared.add(el.dataset[k]); });
    });
    return [...declared].filter(n => !ActionRegistry.has(n));
  });
  if (uncovered.length) { console.error('UNREGISTERED actions in DOM:', uncovered.join(', ')); failed++; }

  for (const [name, sel, check, setup] of CASES) {
    try {
      if (setup) await page.evaluate(setup);
      await page.waitForTimeout(160);
      const el = await page.$(sel);
      if (!el) { console.warn(`SKIP  ${name} (not rendered)`); skipped++; continue; }
      // Anything inside the wheel needs force: it breathes on an infinite
      // animation, so Playwright never sees a "stable" box for it.
      const inWheel = sel.includes('wheelInfoBtn') || sel.includes('#wg');
      await el.click({ timeout: 4000, force: inWheel });
      await page.waitForTimeout(300);
      const ok = await page.evaluate(check);
      if (!ok) { console.error(`FAIL  ${name}`); failed++; }
    } catch (err) {
      console.error(`FAIL  ${name} — ${String(err.message).split('\n')[0].slice(0, 80)}`);
      failed++;
    }
  }

  if (unknownActions.length) { console.error('UNKNOWN action at runtime:', [...new Set(unknownActions)].join(' | ')); failed++; }

  const passed = CASES.length - failed - skipped;
  console.log(`Controls: ${passed}/${CASES.length} passed${skipped ? `, ${skipped} skipped` : ''}`);
  if (pageErrors.length) console.warn(`(${pageErrors.length} page error(s), e.g. ${pageErrors[0].slice(0, 100)})`);
  await browser.close();
  process.exit(failed ? 1 : 0);
} catch (err) {
  console.error('Runner error:', err.message);
  await browser.close();
  process.exit(1);
}
