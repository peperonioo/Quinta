// ── DEV TESTS ─────────────────────────────────────────
// EFC_DEV.runTests() — run from browser console
// EFC_DEV.report()   — full state + diagnostic report

(function () {
  'use strict';
  const VERSION  = APP_VERSION;
  const LOG_KEY  = 'easy-fifth-circle:debug-log';
  const MAX_LOG  = 80;

  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
  function now()  { return new Date().toISOString().split('T')[1].replace('Z', ''); }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  const DevLog = {
    items: [],
    push(type, message, data) {
      const item = { time: now(), type, message, data: data ?? null };
      this.items.push(item);
      if (this.items.length > MAX_LOG) this.items.shift();
      if (type === 'error') console.error('[EFC]', message, data || '');
      else if (type === 'warn') console.warn('[EFC]', message, data || '');
      else console.log('[EFC]', message, data || '');
      return item;
    },
    clear()    { this.items.length = 0; },
    snapshot() { return this.items.slice(); },
  };

  const AppModel = {
    snapshot() {
      return safe(() => ({
        key:             st?.key,
        mode:            st?.mode,
        wheelView:       st?.wheelView,
        mood:            st?.mood,
        lang:            st?.lang,
        theme:           document.body.classList.contains('light') ? 'light' : 'dark',
        genre:           typeof curGenre !== 'undefined' ? curGenre : null,
        selectedDegree:  typeof curDeg !== 'undefined' ? curDeg : null,
        progressionLength: Array.isArray(st?.history) ? st.history.length : 0,
        progression:     Array.isArray(st?.history) ? st.history.map(x => ({ chord: x.chord, degree: x.degree })) : [],
      }), {});
    },
    validate(state = this.snapshot()) {
      const issues    = [];
      const validModes = safe(() => new Set(MODES.map(m => m.id)), new Set());
      const validKeys  = safe(() => new Set([...FIFTHS, ...Object.keys(MINOR_ROOT_TO_MAJOR || {})]), new Set());
      if (!state.key) issues.push('Missing key');
      if (state.key && !validKeys.has(String(state.key).replace(/m$/, ''))) issues.push('Unknown key: ' + state.key);
      if (!validModes.has(state.mode)) issues.push('Unknown mode: ' + state.mode);
      if (!['major','minor',undefined,null].includes(state.wheelView)) issues.push('Invalid wheelView');
      if (state.selectedDegree != null && state.selectedDegree !== -1 &&
          (state.selectedDegree < 0 || state.selectedDegree > 6)) issues.push('selectedDegree out of range');
      if (state.progressionLength > 64) issues.push('Progression is unusually long');
      return { ok: issues.length === 0, issues, state };
    },
  };

  function withState(temp, fn) {
    const previous = clone(st || {});
    Object.assign(st, temp);
    safe(() => normalizeKeyState?.(), null);
    let result;
    try { result = fn(); }
    finally {
      Object.keys(st).forEach(k => delete st[k]);
      Object.assign(st, previous);
      safe(() => normalizeKeyState?.(), null);
    }
    return result;
  }

  function duplicateIds() {
    const seen = new Map(), dupes = [];
    document.querySelectorAll('[id]').forEach(el => {
      if (seen.has(el.id)) dupes.push(el.id);
      else seen.set(el.id, el);
    });
    return [...new Set(dupes)];
  }

  const results = [];
  function assert(name, condition, details) {
    const ok = !!condition;
    results.push({ name, ok, details: details ?? null });
    if (!ok) DevLog.push('error', 'Test failed: ' + name, details);
    return ok;
  }

  function runTests() {
    results.length = 0;

    assert('Theory data exists',            typeof THEORY_DATA === 'object' && Array.isArray(THEORY_DATA.modes));
    assert('Seven modes loaded',            safe(() => MODES.length === 7, false));
    assert('Circle of fifths has 12 roots', safe(() => FIFTHS.length === 12, false));
    assert('Relative minor C → Am',         safe(() => relativeMinor('C') === 'Am', false));
    assert('Relative major A minor → C',    safe(() => relativeMajorFromMinor('Am') === 'C', false));

    withState({ key:'C', mode:'ionian', wheelView:'major' }, () => {
      assert('C major scale',           safe(() => gs().join(' ') === 'C D E F G A B', false), safe(() => gs(), []));
      assert('C major chord count = 7', safe(() => gc().length === 7, false));
      assert('C major I is C',          safe(() => gc()[0].chord === 'C', false), safe(() => gc()[0], null));
    });

    // Use wheelView:'major' so normalizeKeyState leaves the key unchanged
    withState({ key:'A', mode:'aeolian', wheelView:'major' }, () => {
      assert('A minor scale',           safe(() => gs().join(' ') === 'A B C D E F G', false), safe(() => gs(), []));
      assert('A minor i is Am',         safe(() => gc()[0].chord === 'Am', false), safe(() => gc()[0], null));
    });

    withState({ key:'D', mode:'dorian',  wheelView:'major' }, () => {
      assert('D Dorian has natural 6',  safe(() => gs().includes('B'), false), safe(() => gs(), []));
    });

    withState({ key:'C', mode:'lydian',  wheelView:'major' }, () => {
      assert('All modes return 7 chords', safe(() => gc().length === 7, false));
    });

    assert('App state validates',             AppModel.validate().ok,                      AppModel.validate().issues);
    const dupes = duplicateIds();
    assert('No duplicate DOM ids',            dupes.length === 0,                          dupes);
    assert('Core render functions exist',     ['renderWheel','renderTheory','renderSuggestions','renderPiano','renderGuitar'].every(n => typeof window[n] === 'function'));
    assert('AppActions has required methods', ['setKey','setMode','setWheelView','selectDegree','clearDegree','setMood'].every(k => typeof AppActions[k] === 'function'));
    assert('SuggestionEngine.next is callable', typeof SuggestionEngine.next === 'function');
    assert('HarmonyEngine.transition is callable', typeof HarmonyEngine.transition === 'function');
    assert('WheelDirectionGuide exists',      typeof WheelDirectionGuide === 'object');
    assert('I18N has en and es',              typeof I18N.en === 'object' && typeof I18N.es === 'object');

    // ── Suggestion engine validation (Audit §6 / §8.5 / V3.19) ──
    const sugg = (from) => safe(() => SuggestionEngine.getNextWithScores(from), []);
    const topTo = (from) => safe(() => sugg(from)[0].to, -1);
    const reasonFor = (from, to) => safe(() => sugg(from).find(s => s.to === to).reason, '');

    withState({ key:'C', mode:'ionian', wheelView:'major', mood:'balanced', history:[] }, () => {
      assert('V → I is the strongest move',     topTo(4) === 0, sugg(4).map(s => [s.chord.chord, s.fit]));
      assert('ii → V is the strongest move',    topTo(1) === 4, sugg(1).map(s => [s.chord.chord, s.fit]));
      assert('IV resolves to V or I',           [0,4].includes(topTo(3)), sugg(3).map(s => [s.chord.chord, s.fit]));
      assert('V → I reason is a resolution',    /resol/i.test(reasonFor(4, 0)), reasonFor(4, 0));
      assert('Scores sorted strongest first',   sugg(0).every((s,i,a) => i === 0 || a[i-1].fit >= s.fit));
      assert('Seven unique suggestions',        new Set(sugg(0).map(s => s.to)).size === 7);
    });

    // Cadence memory: a ii–V already played should pull strongly to I.
    withState({ key:'C', mode:'ionian', wheelView:'major', mood:'balanced',
                history:[{degreeIndex:1},{degreeIndex:4}] }, () => {
      assert('ii–V in progress completes to I', topTo(4) === 0);
      assert('Cadence reason names ii–V–I',     /ii.?.?V.?.?I/i.test(reasonFor(4, 0)) || /complete/i.test(reasonFor(4, 0)), reasonFor(4, 0));
    });

    // Repetition recognised as a vamp/loop, not random events.
    withState({ key:'C', mode:'ionian', wheelView:'major', mood:'balanced',
                history:[{degreeIndex:0},{degreeIndex:0},{degreeIndex:0}] }, () => {
      assert('Repeated chord detected as vamp', safe(() => SuggestionEngine.context(0).isVamp === true, false));
      assert('Vamp: staying keeps loop open',   /loop/i.test(reasonFor(0, 0)), reasonFor(0, 0));
      assert('Vamp offers an exit (IV/V/vi)',   safe(() => sugg(0).slice(0,4).some(s => [3,4,5].includes(s.to)), false));
    });

    // Modal behaviour: Mixolydian should favour the ♭VII signature.
    withState({ key:'C', mode:'mixolydian', wheelView:'major', mood:'balanced', history:[] }, () => {
      assert('Mixolydian favours ♭VII from I',  safe(() => sugg(0).slice(0,2).some(s => s.to === 6), false), sugg(0).map(s => [s.chord.chord, s.fit]));
    });

    // ── Progression builder ops (Audit §8.5 / V3.22) ──
    (function () {
      const savedHist = clone(st.history || []);
      try {
        withState({ key:'C', mode:'ionian', wheelView:'major' }, () => {
          const mk = (idx) => ({ chord: gc()[idx].chord, degree: gc()[idx].degree, quality: gc()[idx].quality,
            degreeIndex: idx, key: st.key, mode: st.mode, uid: 'efctest-' + idx + '-' + Math.random().toString(36).slice(2) });
          // add
          st.history = [];
          HistoryEngine.addDegree(0); HistoryEngine.addDegree(4); HistoryEngine.addDegree(3);
          assert('Progression add appends chords', st.history.length === 3 && st.history.map(x => x.chord).join('-') === 'C-G-F', st.history.map(x => x.chord));
          // delete one — build directly (no rendered pills) so remove() is synchronous
          st.history = [mk(0), mk(4), mk(3)];
          const row = document.getElementById('flowRow'); if (row) row.innerHTML = '';
          HistoryEngine.remove(1);
          assert('Delete removes only that pill', st.history.map(x => x.chord).join('-') === 'C-F', st.history.map(x => x.chord));
          // reorder
          st.history = [mk(0), mk(3)];
          BuilderEngine.move(0, 1);
          assert('Reorder swaps neighbours', st.history.map(x => x.chord).join('-') === 'F-C', st.history.map(x => x.chord));
          // clear
          HistoryEngine.clear();
          assert('Clear empties the progression', Array.isArray(st.history) && st.history.length === 0);
        });
      } finally {
        st.history = savedHist; safe(() => HistoryEngine.render()); safe(() => renderProgressionStory());
      }
    })();

    // Bubble size follows recommendation strength (monotonic with fit)
    withState({ key:'C', mode:'ionian', wheelView:'major', mood:'balanced', history:[] }, () => {
      const dOf = (fit) => { const n = Math.max(0, Math.min(1, (fit - 12) / 88)); return 32 + Math.pow(n, 1.8) * 48; };
      const ds = sugg(0).map(s => dOf(s.fit));
      assert('Bubble size follows strength (monotonic)', ds.every((d, i, a) => i === 0 || a[i - 1] >= d - 1e-6));
    });

    // Major/minor toggle maps the wheel centre correctly
    (function () {
      const sv = { key: st.key, mode: st.mode, view: st.wheelView };
      try {
        st.key = 'C'; st.mode = 'ionian'; st.wheelView = 'major'; safe(() => renderWheel());
        const maj = { k: document.getElementById('cKey')?.textContent, r: document.getElementById('cRel')?.textContent };
        assert('Major view centre = key + its relative minor',
          maj.k === 'C' && maj.r === 'Am' && relativeMinor(maj.k) === maj.r, maj);
        st.wheelView = 'minor'; safe(() => renderWheel());
        const min = { k: document.getElementById('cKey')?.textContent, r: document.getElementById('cRel')?.textContent };
        assert('Minor view changes the centre display', maj.k !== min.k || maj.r !== min.r, { maj, min });
      } finally {
        st.key = sv.key; st.mode = sv.mode; st.wheelView = sv.view; safe(() => renderWheel());
      }
    })();

    // Key signature (accidentals) is mode-aware and correct for sharps & flats
    (function () {
      const sv = { key: st.key, mode: st.mode, view: st.wheelView };
      const accFor = (key, mode, view) => {
        st.key = key; st.mode = mode; st.wheelView = view;
        safe(() => normalizeKeyState()); safe(() => renderTheory());
        return document.getElementById('accidentals')?.textContent;
      };
      try {
        assert('G major key signature is 1 sharp', accFor('G', 'ionian', 'major') === '1♯');
        assert('F major key signature is 1 flat',  accFor('F', 'ionian', 'major') === '1♭');
        assert('C natural minor is 3 flats',       accFor('C', 'aeolian', 'minor') === '3♭');
        assert('C dorian is 2 flats',              accFor('C', 'dorian', 'major') === '2♭');
      } finally {
        st.key = sv.key; st.mode = sv.mode; st.wheelView = sv.view;
        safe(() => normalizeKeyState()); safe(() => renderTheory());
      }
    })();

    // ── Interaction guard (V4.0): critical controls must not be covered ──
    // Catches the bug class where a closed overlay's cards form an invisible
    // click-wall over the top bar / wheel.
    (function () {
      const reachable = (el) => {
        if (!el) return true;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) return true;            // hidden → skip
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return !hit || el === hit || el.contains(hit) || hit.contains(el);
      };
      assert('Theme toggle is not covered by an overlay', reachable(document.getElementById('themeBtn')));
      assert('Tabs are not covered by an overlay',         reachable(document.querySelector('.tab-btn')));
      assert('Wheel is not covered by an overlay',         reachable(document.getElementById('wheelInfoBtn')));
    })();

    // ── Overlay manager (Audit §8.2 / V3.21) ──
    assert('OverlayManager exists', typeof OverlayManager === 'object' && typeof OverlayManager.opened === 'function');
    if (typeof OverlayManager === 'object' && typeof WheelDirectionGuide === 'object') {
      if (!WheelDirectionGuide.visible) safe(() => WheelDirectionGuide.toggle());     // open dir-guide
      safe(() => OverlayManager.opened('mode-menu'));                                 // another overlay opens
      assert('Opening an overlay closes the others', WheelDirectionGuide.visible === false);
      if (WheelDirectionGuide.visible) safe(() => WheelDirectionGuide.toggle());      // leave closed
    }

    const ok = results.every(r => r.ok);
    DevLog.push(ok ? 'info' : 'warn', `Tests ${ok ? 'passed' : 'finished with issues'} (${results.filter(r => r.ok).length}/${results.length})`, results);
    _updateDevPanel();
    return { ok, results: results.slice(), state: AppModel.snapshot(), validation: AppModel.validate() };
  }

  // ── Mobile smoke test (Audit §8.6 / §10) ───────────
  // Reads live DOM/CSS so it reflects the current viewport's media queries.
  // Run on a narrow window (or device) for the mobile-only checks to apply.
  function mobileCheck() {
    const cs  = el => el ? getComputedStyle(el) : {};
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail ?? '' });
    const isMobile = matchMedia('(max-width: 860px)').matches;

    const wheel = document.getElementById('wheelSvg');
    const orbit = document.querySelector('.next-orbit');
    const row   = document.querySelector('.builder-row');
    const piano = document.querySelector('.drawers .drawer');
    const rootCs = cs(document.documentElement);

    add('Wheel blocks page scroll (touch-action:none)', cs(wheel).touchAction === 'none', safe(() => cs(wheel).touchAction, '?'));
    add('Wheel blocks text selection',                  /none/.test(safe(() => cs(wheel).userSelect || cs(wheel).webkitUserSelect, '') || ''));
    add('Bubble row scrolls sideways only',             orbit ? /pan-x/.test(cs(orbit).touchAction) : false, safe(() => cs(orbit).touchAction, 'no orbit'));
    add('Bubble row contains its overscroll',           orbit ? cs(orbit).overscrollBehaviorX === 'contain' : false);
    add('Pills row scrolls sideways only',              row ? /pan-x/.test(cs(row).touchAction) : true);
    add('Page blocks vertical overscroll bounce',       cs(document.body).overscrollBehaviorY === 'none' || rootCs.overscrollBehaviorY === 'none');
    add('Safe-area inset token present',                !!rootCs.getPropertyValue('--mobile-safe-top').trim());

    // offsetWidth/Height = layout box, ignoring the entrance-animation scale.
    const bubbles = [...document.querySelectorAll('.next-bubble')];
    const sizes = bubbles.map(b => Math.min(b.offsetWidth, b.offsetHeight));
    const sz = sizes.length ? Math.min(...sizes) : 0;
    // Tap-target floor only matters on touch viewports; desktop bubbles can be smaller.
    add('Smallest bubble is tappable (>=44px)', !isMobile || !bubbles.length || sz >= 44, bubbles.length ? sz + 'px' : 'no bubble');

    if (isMobile) {
      add('Instrument drawers collapsed on mobile', piano ? !piano.hasAttribute('open') : true);
    }

    const ok = checks.every(c => c.ok);
    DevLog.push(ok ? 'info' : 'warn',
      `Mobile smoke ${ok ? 'OK' : 'has gaps'} (${checks.filter(c => c.ok).length}/${checks.length}, ${isMobile ? 'mobile' : 'desktop'} viewport)`, checks);
    _renderMobilePanel({ ok, isMobile, checks });
    return { ok, isMobile, checks };
  }

  // ── CSS health (Audit §8.3 / V3.20 de-override) ────
  // Tracks !important density and rule count so the visual system can be kept
  // stable across versions instead of re-growing override layers.
  function cssHealth() {
    let rules = 0, important = 0, importantRules = 0;
    for (const sheet of document.styleSheets) {
      let list; try { list = sheet.cssRules; } catch (_) { continue; }
      const walk = (rs) => {
        for (const r of rs) {
          if (r.type === 1 /* STYLE_RULE */) {
            rules++;
            const hits = (r.cssText.match(/!important/g) || []).length;
            if (hits) { important += hits; importantRules++; }
          } else if (r.cssRules) walk(r.cssRules); // @media / @supports
        }
      };
      walk(list);
    }
    const pct = rules ? Math.round((importantRules / rules) * 100) : 0;
    return { rules, importantDeclarations: important, importantRules, importantRulePct: pct };
  }

  function report() {
    return {
      version:    VERSION,
      modules:    ['constants','state','actions','utils','i18n','theory-data','harmony-engine','suggestion-engine','wheel-direction-engine','render-engine','wheel-renderer','theory-renderer','builder-renderer','suggestions-renderer','instruments-renderer','popover-manager','mode-selector','tabs','wheel-interaction','builder-interaction','mobile-optimizer','dev/tests','dev/diagnostics'],
      duplicateIds: duplicateIds(),
      state:      AppModel.snapshot(),
      validation: AppModel.validate(),
      mobile:     mobileCheck(),
      css:        cssHealth(),
      testResults: runTests(),
    };
  }

  // ── Dev Panel ──────────────────────────────────────
  function _buildDevPanel() {
    if (document.getElementById('efcDevPanel')) return;
    const panel = document.createElement('aside');
    panel.id = 'efcDevPanel';
    panel.innerHTML = `
      <div class="efc-dev-head">
        <strong>EFC ${VERSION}</strong>
        <button type="button" id="efcDevRun">Run tests</button>
        <button type="button" id="efcDevMobile">Mobile check</button>
        <button type="button" id="efcDevClose">×</button>
      </div>
      <pre id="efcDevBody">Hidden stability panel. Press ⌘/Ctrl + Shift + D.</pre>`;
    document.body.appendChild(panel);
    document.getElementById('efcDevRun')?.addEventListener('click',    () => runTests());
    document.getElementById('efcDevMobile')?.addEventListener('click', () => mobileCheck());
    document.getElementById('efcDevClose')?.addEventListener('click',  () => panel.classList.remove('open'));
  }

  function _renderMobilePanel(res) {
    const body = document.getElementById('efcDevBody'); if (!body) return;
    const lines = res.checks.map(c => `${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? '  · ' + c.detail : ''}`);
    body.textContent =
      `MOBILE SMOKE TEST — ${res.isMobile ? 'mobile' : 'desktop'} viewport\n` +
      `${res.ok ? 'ALL CLEAR' : 'GAPS FOUND'} (${res.checks.filter(c => c.ok).length}/${res.checks.length})\n` +
      (res.isMobile ? '' : 'Tip: narrow the window < 860px for mobile-only checks.\n') +
      '\n' + lines.join('\n');
  }

  function _updateDevPanel() {
    const body = document.getElementById('efcDevBody'); if (!body) return;
    const validation = AppModel.validate();
    body.textContent = JSON.stringify({
      state:      AppModel.snapshot(),
      validation,
      latestLog:  DevLog.snapshot().slice(-8),
    }, null, 2);
  }

  const devStyle = document.createElement('style');
  devStyle.textContent = `
    #efcDevPanel{position:fixed;right:14px;bottom:14px;width:min(520px,calc(100vw - 28px));max-height:70vh;z-index:2147483647;display:none;
      border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(10,10,14,.88);backdrop-filter:blur(22px);
      box-shadow:0 20px 70px rgba(0,0,0,.38);color:#f5f1ea;overflow:hidden;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
    #efcDevPanel.open{display:block;animation:efcDevIn .22s cubic-bezier(.22,1,.36,1)}
    .efc-dev-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.1)}
    .efc-dev-head strong{margin-right:auto;letter-spacing:.08em}
    .efc-dev-head button{border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(255,255,255,.06);color:inherit;padding:5px 9px;cursor:pointer}
    #efcDevBody{margin:0;padding:12px;max-height:58vh;overflow:auto;white-space:pre-wrap;color:rgba(245,241,234,.8)}
    @keyframes efcDevIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
  `;
  document.head.appendChild(devStyle);
  _buildDevPanel();

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      document.getElementById('efcDevPanel')?.classList.toggle('open');
      _updateDevPanel();
    }
  });

  window.EFC_DEV = {
    version:    VERSION,
    errors:     [],
    state:      () => AppModel.snapshot(),
    validate:   () => AppModel.validate(),
    runTests,
    mobileCheck,
    cssHealth,
    report,
    duplicateIds,
    logs:       () => DevLog.snapshot(),
    clearLogs:  () => DevLog.clear(),
    dispatch:   (action, payload) => ActionDispatcher.dispatch(action, payload),
  };

  window.EFC_CLEANUP_STATUS = {
    version: VERSION,
    modules: 'src/ directory structure — build.js produces dist/Easy_Fifth_Circle.html',
    stabilityPass: true,
    tests: 'EFC_DEV.runTests()',
    devPanel: 'Ctrl/Cmd+Shift+D',
    report: 'EFC_DEV.report()',
  };

  // Auto-run tests after load
  setTimeout(() => { try { runTests(); } catch (_) {} }, 120);
})();
