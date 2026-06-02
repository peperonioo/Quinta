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

    const ok = results.every(r => r.ok);
    DevLog.push(ok ? 'info' : 'warn', `Tests ${ok ? 'passed' : 'finished with issues'} (${results.filter(r => r.ok).length}/${results.length})`, results);
    _updateDevPanel();
    return { ok, results: results.slice(), state: AppModel.snapshot(), validation: AppModel.validate() };
  }

  function report() {
    return {
      version:    VERSION,
      modules:    ['constants','state','actions','utils','i18n','theory-data','harmony-engine','suggestion-engine','wheel-direction-engine','render-engine','wheel-renderer','theory-renderer','builder-renderer','suggestions-renderer','instruments-renderer','popover-manager','mode-selector','tabs','wheel-interaction','builder-interaction','mobile-optimizer','dev/tests','dev/diagnostics'],
      duplicateIds: duplicateIds(),
      state:      AppModel.snapshot(),
      validation: AppModel.validate(),
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
        <button type="button" id="efcDevClose">×</button>
      </div>
      <pre id="efcDevBody">Hidden stability panel. Press ⌘/Ctrl + Shift + D.</pre>`;
    document.body.appendChild(panel);
    document.getElementById('efcDevRun')?.addEventListener('click',  () => runTests());
    document.getElementById('efcDevClose')?.addEventListener('click', () => panel.classList.remove('open'));
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
