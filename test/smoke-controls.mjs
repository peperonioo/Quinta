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
// Open the "···" panel first — these controls moved inside it in V6.33.
const MORE = () => { switchTab('build'); const m = document.getElementById('builderMore');
  if (m.hasAttribute('hidden')) document.getElementById('moreBtn').click(); };
const CASES = [
  ['settings.toggle',  '#settingsBtn',                                    () => !document.getElementById('settingsSheet').hidden],
  ['set.theme light',  '[data-act="set.theme"][data-id="light"]',         () => document.body.classList.contains('light')],
  ['set.theme dark',   '[data-act="set.theme"][data-id="dark"]',          () => !document.body.classList.contains('light')],
  ['settings.close',   '.settings-sheet .mod-x',                          () => document.getElementById('settingsSheet').hidden],
  ['view.set minor',   '[data-act="view.set"][data-id="minor"]',          () => st.wheelView === 'minor', () => switchTab('explore')],
  ['view.set major',   '[data-act="view.set"][data-id="major"]',          () => st.wheelView === 'major'],
  ['builder.surprise', '[data-act="builder.surprise"]',                   () => (st.history || []).length > 0,
    () => { switchTab('build'); const m = document.getElementById('builderMore');
            if (m.hasAttribute('hidden')) document.getElementById('moreBtn').click(); }],
  ['prog.loop',        '#loopBtn',                                        () => st.loop === true],
  ['prog.chain',       '#chainBtn',                                       () => st.chain === true],
  // Earlier cases leave the panel open; close it so this toggle OPENS.
  ['builder.more',     '#moreBtn',                                        () => !document.getElementById('builderMore').hasAttribute('hidden'),
    () => { const m = document.getElementById('builderMore');
            if (!m.hasAttribute('hidden')) document.getElementById('moreBtn').click(); }],
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
  // V6.26 — Instrument is a mode again. The dock lives inside the transport
  // island on phones, so switching has to bring it home or you land on a page
  // whose subject is buried in a collapsed sheet.
  ['tab.go instrument', '[data-act="tab.go"][data-tab="instrument"]',       () => document.body.dataset.mode === 'instrument'
     && document.querySelector('.drawers').getBoundingClientRect().height > 40, () => switchTab('build')],
  ['instr.go guitar',  '.instr-tab[data-instr="guitar"]',                   () => st.instr === 'guitar'
     && document.querySelectorAll('.drawers .drawer[open]').length === 1],
  ['instr.go piano',   '.instr-tab[data-instr="piano"]',                    () => st.instr === 'piano'],
  ['ctx.key → explore','[data-act="ctx.key"]',                            () => document.body.dataset.mode === 'explore', () => switchTab('build')],
  // Tapping a chord must show its variations WITHOUT scrolling. This regressed
  // once (the inspector sat 628px down an 844px screen, so only its header
  // showed) and was reported as "se quitó lo de las séptimas y novenas".
  ['chord tap → variations', '.builder-step',                             () => {
      const v = [...document.querySelectorAll('.insp-var')];
      return v.length >= 6 && v.every(x => { const r = x.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight; });
    }, () => { switchTab('build'); if (!(st.history||[]).length) surpriseMe(); }],
  // The × on the selected clip. Two things can break it: the action, and the
  // lane's horizontal overflow clipping a control that hangs off the corner —
  // so this asserts the click LANDS on the button, not just that it exists.
  ['clip.remove',      '.builder-step.is-selected .step-x',                () => (st.history || []).length === window.__nBefore - 1,
    () => { switchTab('build'); if (!(st.history||[]).length) surpriseMe();
            Inspector.select(0); window.__nBefore = st.history.length;
            const x = document.querySelector('.builder-step.is-selected .step-x');
            const r = x && x.getBoundingClientRect();
            if (!r || r.width < 14) throw new Error('× not rendered');
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            if (!x.contains(hit) && hit !== x) throw new Error('× is covered/clipped'); }],
  // The wheel WRITES (V2). Tapping an in-key sector appends that chord instead of
  // only sounding it — the product is named after this thing and for six versions
  // it could not put a single chord into a progression.
  ['wheel adds a chord', '#wg > g',                                       () => (st.history || []).length > 0,
    () => { switchTab('explore'); HistoryEngine.clear(); }],
  ['tab.go build back','[data-act="tab.go"][data-tab="build"]',            () => document.body.dataset.mode === 'build'],
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

  // The suggestion row is the ONLY place that answers "what goes well after this
  // chord" now — the inspector's copy of it was removed. So the row has to read
  // from the selection, not from the last clip in the lane.
  {
    const r = await page.evaluate(async () => {
      const wait = () => new Promise(res => setTimeout(res, 260));
      switchTab('build'); HistoryEngine.clear(); surpriseMe(); await wait();
      const seen = [];
      for (const i of [0, 1, 2]) {
        Inspector.select(i); await wait();
        seen.push(document.querySelector('.next-from b')?.textContent || '');
      }
      const chords = [0, 1, 2].map(i => st.history[i] && st.history[i].chord);
      return { seen, chords, dupe: document.querySelectorAll('.insp-next').length };
    });
    // Each selection must label the row with THAT chord, and no second copy exists.
    const wrong = r.seen.filter((v, i) => v !== r.chords[i]);
    if (wrong.length) { console.error(`FAIL  suggestion row follows selection (${r.seen.join('/')} vs ${r.chords.join('/')})`); failed++; }
    if (r.dupe) { console.error('FAIL  inspector still duplicates the suggestion row'); failed++; }
  }

  // ── Mobile pass ──────────────────────────────────────
  // Everything above runs at 1440x1000. The inspector's phone layout is a fixed
  // bottom sheet, and it was silently NOT fixed: two ancestors carry a transform
  // (the wheel-collapse, and #panel-theory's tab-enter leaving an identity
  // matrix), and a transformed ancestor becomes the containing block for
  // position:fixed. The sheet drifted up as you scrolled and covered the very
  // clip you were editing. Asserted here because it only reproduces on a phone.
  {
    const mp = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mp.goto(FILE, { waitUntil: 'load' });
    await mp.waitForFunction(() => typeof ActionRegistry === 'object', null, { timeout: 20000 });
    await mp.waitForTimeout(1400);
    await mp.evaluate(() => {
      try { document.getElementById('splash')?.remove(); } catch (_) {}
      try { Onboarding.close(); } catch (_) {}
      try { Comeback.close(); } catch (_) {}
      switchTab('build'); if (!(st.history || []).length) surpriseMe(); Inspector.select(0);
    });
    await mp.waitForTimeout(1100);
    const m = await mp.evaluate(() => {
      const bar = document.getElementById('tabbar');
      const bb = bar.getBoundingClientRect();
      const sheet = document.getElementById('inspector').getBoundingClientRect();
      const x = document.querySelector('.builder-step.is-selected .step-x');
      const r = x && x.getBoundingClientRect();
      const hit = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        anchored: Math.abs(sheet.bottom - innerHeight) < 2,     // runs to the screen edge, capsule floats on it
        clipClear: !!r && r.bottom < sheet.top,                 // the clip is not under the sheet
        xReachable: !!r && (x.contains(hit) || hit === x),
        // A FLOATING capsule (V6.27), not an edge-to-edge bar: air on both sides
        // and under it, and narrower than the screen. The V6.26 shape passes
        // none of these.
        barFloats: getComputedStyle(bar).display !== 'none'
          && bb.left > 6 && bb.right < innerWidth - 6 && bb.bottom < innerHeight - 4,
        // ...and the sheet's own content still clears it.
        barClear: (() => {
          const btns = [...document.querySelectorAll('#inspector button')]
            .filter(x => x.getBoundingClientRect().height > 6);
          if (!btns.length) return false;
          return Math.max(...btns.map(x => x.getBoundingClientRect().bottom)) <= bb.top;
        })(),
        topTabsGone: getComputedStyle(document.querySelector('.tabs')).display === 'none',
      };
    });
    for (const k of ['anchored', 'clipClear', 'xReachable', 'barFloats', 'barClear', 'topTabsGone']) {
      if (!m[k]) { console.error(`FAIL  mobile: ${k}`); failed++; }
    }

    // The capsule stands down while you scroll INTO content and comes back on
    // the way out. Measured on the real element, not the class, so a broken
    // transition or a missing rule fails it too.
    const min = await mp.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const w = () => document.getElementById('tabbar').getBoundingClientRect().width;
      scrollTo(0, 0); await wait(420); const rest = w();
      scrollTo(0, 420); await wait(520); const down = w();
      scrollTo(0, 140); await wait(520); const up = w();
      return { shrinks: down < rest - 12, restores: Math.abs(up - rest) < 2 };
    });
    for (const k of ['shrinks', 'restores']) {
      if (!min[k]) { console.error(`FAIL  mobile tabbar: ${k}`); failed++; }
    }
    await mp.evaluate(() => scrollTo(0, 0));
    await mp.waitForTimeout(300);

    // Press-and-slide: hold a tab, drag across, lift on another. Coordinates are
    // re-measured after the hold on purpose — the capsule reflows when the
    // scrubbed tab's label expands, so pre-hold coordinates land on the wrong
    // button (which is exactly how this first "failed" in development).
    {
      await mp.evaluate(() => { switchTab('build'); scrollTo(0, 0); });
      await mp.waitForTimeout(500);
      const at = t => mp.evaluate(tab => {
        const r = document.querySelector(`.tb-btn[data-tab="${tab}"]`).getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, t);
      const from = await at('build');
      await mp.mouse.move(from.x, from.y);
      await mp.mouse.down();
      await mp.waitForTimeout(340);
      const held = await mp.evaluate(() => document.body.classList.contains('tabbar-scrubbing'));
      const to = await at('instrument');                     // measured AFTER the reflow
      await mp.mouse.move(to.x, to.y, { steps: 8 });
      await mp.waitForTimeout(200);
      const previewing = await mp.evaluate(() => document.querySelector('.tb-btn.is-scrub')?.dataset.tab);
      await mp.mouse.up();
      await mp.waitForTimeout(600);
      const after = await mp.evaluate(() => ({
        mode: document.body.dataset.mode,
        cleared: !document.body.classList.contains('tabbar-scrubbing') && !document.querySelector('.tb-btn.is-scrub'),
      }));
      if (!held)                       { console.error('FAIL  mobile scrub: hold did not arm'); failed++; }
      if (previewing !== 'instrument') { console.error(`FAIL  mobile scrub: preview ${previewing}`); failed++; }
      if (after.mode !== 'instrument') { console.error(`FAIL  mobile scrub: committed ${after.mode}`); failed++; }
      if (!after.cleared)              { console.error('FAIL  mobile scrub: state left behind'); failed++; }
      await mp.evaluate(() => switchTab('build'));
      await mp.waitForTimeout(300);
    }

    // The tour walks the tabs (V6.34). Its old opening bug — asking for a
    // button that lives in another mode — is exactly what this asserts against:
    // on every step, the spotlight target must be visible in that step's mode,
    // and the wheel-wedge action of step 1 must unlock step 1.
    {
      const tour = await mp.evaluate(async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        HistoryEngine.clear(); await wait(200);
        Onboarding.open(true); await wait(700);
        const out = [];
        for (let i = 0; i < 4; i++) {
          if (i) { Onboarding.go(i); await wait(700); }
          const t = document.querySelector(['#wg', '#progressionStory', '#docBar', '.drawers'][i]);
          const r = t && t.getBoundingClientRect();
          out.push({ step: i + 1, mode: document.body.dataset.mode,
                     visible: !!r && r.width > 0 && r.height > 0 });
        }
        Onboarding.close(); await wait(300);
        return out;
      });
      const expect = ['explore', 'build', 'build', 'instrument'];
      tour.forEach((t, i) => {
        if (t.mode !== expect[i] || !t.visible) {
          console.error(`FAIL  tour step ${t.step}: mode=${t.mode} visible=${t.visible}`); failed++;
        }
      });
    }

    // The transport capsule is the bar's docked accessory: fully ABOVE it (it
    // shipped exactly underneath — a later stylesheet's inset:0 killed the
    // offset), it leaves with the scroll-minimise, and the bar stands down
    // while the island is open.
    {
      // The earlier pass left a chord selected; with the inspector sheet up the
      // capsule hides BY DESIGN, so clear it before measuring.
      await mp.evaluate(() => { switchTab('build'); Inspector.clear(); scrollTo(0, 0); });
      await mp.waitForTimeout(500);
      const acc = await mp.evaluate(async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        // Poll, don't sample: these are .2-.3s transitions, and the CI runner's
        // GPU-less Chrome settles them late — a fixed-delay snapshot flakes there
        // while passing locally every time.
        const settle = async (cond, ms = 2000) => {
          const t0 = performance.now();
          while (performance.now() - t0 < ms) { if (cond()) return true; await wait(80); }
          return cond();
        };
        const gap = () => document.getElementById('tabbar').getBoundingClientRect().top
                        - document.querySelector('.ts-cap').getBoundingClientRect().bottom;
        const capOp = () => getComputedStyle(document.querySelector('.ts-cap')).opacity;
        const r = { restGap: gap() };
        scrollTo(0, 420); r.hiddenOnScroll = await settle(() => capOp() === '0');
        scrollTo(0, 0);   await settle(() => capOp() === '1');
        TransportSheet.open();
        r.barYieldsToIsland = await settle(() => getComputedStyle(document.getElementById('tabbar')).opacity === '0');
        TransportSheet.collapse();
        r.backAfter = await settle(() => capOp() === '1' && gap() >= 4);
        return r;
      });
      if (!(acc.restGap >= 4))    { console.error(`FAIL  mobile accessory: overlaps the bar (gap ${Math.round(acc.restGap)})`); failed++; }
      if (!acc.hiddenOnScroll)    { console.error('FAIL  mobile accessory: stays during scroll-min'); failed++; }
      if (!acc.barYieldsToIsland) { console.error('FAIL  mobile accessory: bar floats over the open island'); failed++; }
      if (!acc.backAfter)         { console.error('FAIL  mobile accessory: does not come back'); failed++; }
    }

    // A swipe that STARTS on the bar is a swipe, not a hold: finger drift past
    // the slop must cancel the arm timer. This is the on-device "se vuelve
    // loco" bug — the timer fired mid-scroll and fought the browser's pan.
    {
      const r = await mp.evaluate(() => {
        const q = document.querySelector('.tb-btn[data-tab="build"]').getBoundingClientRect();
        return { x: q.left + q.width / 2, y: q.top + q.height / 2 };
      });
      await mp.mouse.move(r.x, r.y);
      await mp.mouse.down();
      await mp.mouse.move(r.x + 40, r.y, { steps: 4 });   // move BEFORE the hold arms
      await mp.waitForTimeout(320);
      const armed = await mp.evaluate(() => document.body.classList.contains('tabbar-scrubbing'));
      await mp.mouse.up();
      if (armed) { console.error('FAIL  mobile scrub: swipe armed the hold'); failed++; }
      await mp.waitForTimeout(200);
    }

    // Nothing may widen the page. A board is 620-860px BY DESIGN and scrolls
    // inside its wrap — but if any box in the chain sizes to content instead,
    // the browser does not scroll it, it zooms the WHOLE PAGE out to fit
    // (innerWidth 390 -> 422, every pixel of UI at 92%). It was a flex row
    // missing min-width:0, and the symptom is invisible unless you measure the
    // viewport itself: no console error, no horizontal scrollbar.
    const zoom = { };
    for (const [label, setup] of [
      ['build',        () => switchTab('build')],
      ['instr-piano',  () => { switchTab('instrument'); gotoInstrument('piano'); }],
      ['instr-guitar', () => { switchTab('instrument'); gotoInstrument('guitar'); }],
      ['island',       () => { switchTab('build'); TransportSheet.open(); }],
    ]) {
      await mp.evaluate(setup);
      await mp.waitForTimeout(700);
      zoom[label] = await mp.evaluate(() => innerWidth);
    }
    for (const k of Object.keys(zoom)) {
      if (zoom[k] !== 390) { console.error(`FAIL  mobile zoom-out in ${k}: innerWidth ${zoom[k]} (expected 390)`); failed++; }
    }
    await mp.evaluate(() => { TransportSheet.collapse(); switchTab('build'); });
    await mp.waitForTimeout(400);

    // Instrument mode, on a phone specifically: the dock normally lives inside
    // the transport island here, so switching has to bring it home. On a desktop
    // it already is home, which is why this cannot be asserted up there.
    await mp.evaluate(() => switchTab('instrument'));
    await mp.waitForTimeout(900);
    const im = await mp.evaluate(() => {
      const dr = document.querySelector('.drawers');
      const r = dr.getBoundingClientRect();
      const board = document.querySelector('.drawer[open] .piano-wrap, .drawer[open] .fretboard-wrap');
      return {
        dockIsPage: dr.parentElement.id !== 'tsInstruments' && r.height > 120,
        oneBoard: document.querySelectorAll('.drawers .drawer[open]').length === 1,
        switchReachable: (() => {
          const b = document.querySelector('.instr-tab'); if (!b) return false;
          const q = b.getBoundingClientRect(); if (q.height < 10) return false;
          const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
          return b.contains(hit) || hit === b;
        })(),
        // A board narrower than the viewport would mean unplayable keys/frets.
        boardScrolls: !!board && board.scrollWidth > board.clientWidth,
      };
    });
    // "Quiero que guitarra, sus shapes etc estén desplegados ya" — on guitar the
    // finger diagrams are open on arrival, and every control whose only job is
    // showing/hiding them is gone (tapping any of them would leave a hole).
    await mp.evaluate(() => gotoInstrument('guitar'));
    await mp.waitForTimeout(800);
    const gs = await mp.evaluate(() => {
      const vis = sel => { const e = document.querySelector(sel);
        return !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none'; };
      return {
        shapesDeployed: document.getElementById('guitarShapeStrip').classList.contains('gss-on')
          && document.querySelectorAll('.gss-card').length >= 3,
        noShapeToggles: !vis('.gss-x') && !vis('.gss-btn') && !vis('.instr-shapes-toggle'),
        summaryInert: getComputedStyle(document.querySelector('.drawer[open] > summary')).pointerEvents === 'none',
      };
    });
    for (const k of ['shapesDeployed', 'noShapeToggles', 'summaryInert']) {
      if (!gs[k]) { console.error(`FAIL  mobile instrument: ${k}`); failed++; }
    }
    // Tuner (V6.33): slide the transport capsule right → the tuner opens; the
    // click that trails the swipe must NOT also open the island under it.
    {
      await mp.evaluate(() => { Inspector.clear(); scrollTo(0, 0); switchTab('build'); });
      await mp.waitForTimeout(500);
      const c = await mp.evaluate(() => { const q = document.querySelector('.ts-cap').getBoundingClientRect();
        return { x: q.left + 20, y: q.top + q.height / 2 }; });
      await mp.mouse.move(c.x, c.y); await mp.mouse.down();
      await mp.mouse.move(c.x + 70, c.y + 2, { steps: 6 }); await mp.mouse.up();
      await mp.waitForTimeout(600);
      const tn = await mp.evaluate(() => ({
        open: Tuner.isOpen(), noIsland: !document.body.classList.contains('ts-open'),
        // Not listening here (no mic in the test browser) → the manual,
        // tap-bound path to the permission prompt MUST be on screen.
        micPath: !document.querySelector('.tn-mic').hidden }));
      await mp.evaluate(() => Tuner.close());
      await mp.waitForTimeout(200);
      if (!tn.open)     { console.error('FAIL  mobile tuner: swipe did not open it'); failed++; }
      if (!tn.noIsland) { console.error('FAIL  mobile tuner: the trailing click opened the island'); failed++; }
      if (!tn.micPath)  { console.error('FAIL  mobile tuner: no manual mic button while not listening'); failed++; }
      const closed = await mp.evaluate(() => !Tuner.isOpen());
      if (!closed) { console.error('FAIL  mobile tuner: does not close'); failed++; }
      await mp.evaluate(() => { switchTab('instrument'); gotoInstrument('guitar'); });
      await mp.waitForTimeout(700);
    }

    // Identify mode (V6.33): toggle on → tap C-E-G → the bar names C; toggle
    // off → shapes come back. The backlog feature, end to end.
    const id = await mp.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('.ident-toggle').click(); await wait(500);
      const tap = (ti, f) => document.querySelector(`.fret-note.ident[data-ik="${ti}:${f}"]`)?.click();
      // A full E-shape barre F, tapped the way a guitarist marks it: the barre
      // first (six taps at fret 1), then the fingers — which must REPLACE the
      // barre note on their string, not stack a second note on it.
      for (let ti = 0; ti < 6; ti++) tap(ti, 1);
      tap(2, 2); tap(4, 3); tap(3, 3);
      await wait(300);
      const named = document.querySelector('.ib-best')?.textContent;
      const oneNotePerString = ChordIdent.sel.size === 6;
      if (!oneNotePerString) { console.error('FAIL  mobile ident: two notes on one string'); failed++; }
      document.querySelector('.ident-toggle').click(); await wait(600);
      return { named, shapesBack: document.getElementById('guitarShapeStrip').classList.contains('gss-on'),
               barGone: !document.getElementById('identBar') };
    });
    if (id.named !== 'F') { console.error(`FAIL  mobile ident: barre F named '${id.named}'`); failed++; }
    if (!id.shapesBack)   { console.error('FAIL  mobile ident: shapes do not return'); failed++; }
    if (!id.barGone)      { console.error('FAIL  mobile ident: readout left behind'); failed++; }

    await mp.evaluate(() => gotoInstrument('piano'));
    await mp.waitForTimeout(400);

    for (const k of ['dockIsPage', 'oneBoard', 'switchReachable', 'boardScrolls']) {
      if (!im[k]) { console.error(`FAIL  mobile instrument: ${k}`); failed++; }
    }
    await mp.close();
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
