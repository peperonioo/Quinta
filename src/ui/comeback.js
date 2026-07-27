// ── COMEBACK PANEL (V6.17) ────────────────────────────
// The audit's "retention without a reason to return": nothing in Quinta called
// you back the next day. This is that reason, and it is deliberately TWO
// independent hooks so the Sheet can tell which one (if either) actually works:
//
//   · Your projects  — what you already made, surfaced instead of buried in "···".
//   · Today's challenge — a key/mode/genre/preset combination that changes daily.
//
// Both are local: no backend, no account, no notification permission. The daily
// challenge is DERIVED FROM THE DATE, so every user sees the same one on the same
// day without a server ever being involved.
const Comeback = (() => {
  const es = () => st.lang === 'es';
  const L = (en, e) => (es() ? e : en);

  // ── Daily challenge ──────────────────────────────────
  // A cheap integer hash of YYYYMMDD. Deterministic by design: same day → same
  // challenge, everywhere, with no coordination.
  function _dayKey(d) {
    const t = d || new Date();
    return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  }
  function _hash(n) {
    let h = n >>> 0;
    h = (h ^ 61) ^ (h >>> 16);
    h = (h + (h << 3)) >>> 0;
    h = h ^ (h >>> 4);
    h = Math.imul(h, 0x27d4eb2d) >>> 0;
    return (h ^ (h >>> 15)) >>> 0;
  }
  function challenge(day) {
    const h = _hash(_dayKey(day));
    const genres = Object.keys(typeof GENRES === 'object' ? GENRES : { house: 1 });
    const roots = (typeof FIFTHS !== 'undefined' && FIFTHS.length) ? FIFTHS : NOTES;
    // Every mode except locrian: its tonic triad is diminished, so a daily prompt
    // built on it has nowhere to resolve. It stays selectable in the mode menu.
    const modes = (typeof MODE_ORDER !== 'undefined')
      ? MODE_ORDER.filter(m => m !== 'locrian') : ['ionian'];
    // Independent slices of the hash so two fields never move in lockstep.
    const mode = modes[(h >>> 4) % modes.length];
    // The preset has to match the mode's tonality, or the card promises "G Lydian"
    // and hands over a progression labelled i–iv–v–i. SURPRISE_POOL already splits
    // the presets into major- and minor-sounding sets; reuse it.
    const minor = (typeof modeIsMinor === 'function') ? modeIsMinor(mode) : false;
    const pool = (typeof SURPRISE_POOL !== 'undefined')
      ? SURPRISE_POOL[minor ? 'minor' : 'major']
      : (typeof PROG_PRESETS !== 'undefined' ? PROG_PRESETS.map((_, i) => i) : []);
    return {
      key:     roots[h % roots.length],
      mode,
      genre:   genres[(h >>> 9) % genres.length],
      preset:  pool && pool.length ? pool[(h >>> 14) % pool.length] : -1,
      dayKey:  _dayKey(day),
    };
  }

  // Load today's challenge into the builder: set the key/mode, switch the genre,
  // drop in the preset and let them hear it.
  function startChallenge() {
    const c = challenge();
    if (typeof AudioEngine === 'object') AudioEngine.resume();     // unlock in this gesture
    if (typeof snapshotAndOfferUndo === 'function') snapshotAndOfferUndo('undo.replaced');
    st.key = c.key;
    st.mode = c.mode;
    st.tonality = (typeof modeIsMinor === 'function' && modeIsMinor(c.mode)) ? 'minor' : 'major';
    st.wheelView = st.tonality;
    if (typeof normalizeKeyState === 'function') normalizeKeyState();
    st.history = [];
    const pr = (typeof PROG_PRESETS !== 'undefined') ? PROG_PRESETS[c.preset] : null;
    if (pr && typeof HistoryEngine === 'object') pr.idx.forEach(d => HistoryEngine.addDegree(d));
    if (typeof curDeg !== 'undefined') curDeg = -1;
    st.dailyDone = c.dayKey;                                        // today's is done
    saveState();
    if (typeof setGenre === 'function') { try { setGenre(c.genre); } catch (_) {} }
    if (typeof RenderEngine === 'object') RenderEngine.full();
    if (typeof tel === 'function') tel('daily_start', { key: c.key, mode: c.mode, genre: c.genre });
    close();
    if (typeof playProgression === 'function') setTimeout(playProgression, 140);
  }

  // ── Projects ─────────────────────────────────────────
  const _saved = () => (typeof Library === 'object' ? Library._read() : []);

  // "2 h", "3 d" — a compact age, no date library.
  function _ago(ts) {
    const m = Math.max(0, Date.now() - (ts || 0)) / 60000;
    if (m < 60)     return L(`${Math.round(m)}m ago`, `hace ${Math.round(m)} min`);
    if (m < 60 * 24) return L(`${Math.round(m / 60)}h ago`, `hace ${Math.round(m / 60)} h`);
    const d = Math.round(m / 1440);
    return d <= 1 ? L('yesterday', 'ayer') : L(`${d}d ago`, `hace ${d} días`);
  }

  const _chords = n => n === 1 ? L('1 chord', '1 acorde') : L(`${n} chords`, `${n} acordes`);

  function resume(id) {
    if (typeof tel === 'function') tel('resume_load');
    close();
    if (typeof Library === 'object') Library.loadSaved(id);
  }

  // ── Panel ────────────────────────────────────────────
  const el = () => document.getElementById('comeback');

  // Shown once per day, from the 2nd visit on, and never on top of the first-run
  // tour or a shared link. The bar is deliberately high: an interstitial that
  // fires every session is a tax, not a hook.
  function shouldShow() {
    if (!st || (st.visits || 0) < 2) return false;
    if (!st.onboarded) return false;
    if (st.comebackSeen === _dayKey()) return false;
    return true;
  }

  function maybeShow() {
    if (!shouldShow()) return;
    st.comebackSeen = _dayKey(); saveState();
    open();
  }

  function open() {
    const e = el(); if (!e) return;
    const c = challenge();
    const list = _saved().slice(0, 3);
    const doneToday = st.dailyDone === c.dayKey;
    const pr = (typeof PROG_PRESETS !== 'undefined') ? PROG_PRESETS[c.preset] : null;
    const g = (typeof GENRES === 'object') ? GENRES[c.genre] : null;
    const modeName = (typeof modeFriendly === 'function') ? modeFriendly(c.mode)[0] : c.mode;

    e.innerHTML = `
      <div class="cb-card" role="dialog" aria-label="${L('Welcome back', 'Bienvenido de vuelta')}">
        <button class="cb-x" data-ico="close" data-ico-size="12" onclick="Comeback.close()"
          aria-label="${L('Close', 'Cerrar')}"></button>
        <div class="cb-head">${L('Welcome back', 'Bienvenido de vuelta')}</div>

        ${list.length ? `
          <div class="cb-sec">
            <div class="cb-lbl">${L('Pick up where you left off', 'Sigue donde lo dejaste')}</div>
            ${list.map(p => `
              <button class="cb-proj" onclick="Comeback.resume('${p.id}')">
                <span class="cb-pname">${p.name}</span>
                <span class="cb-pmeta">${_chords((p.history || []).length)} · ${_ago(p.ts)}</span>
              </button>`).join('')}
          </div>` : ''}

        <div class="cb-sec">
          <div class="cb-lbl">${L("Today's challenge", 'El reto de hoy')}</div>
          <div class="cb-daily${doneToday ? ' cb-done' : ''}">
            <div class="cb-dtop">
              <span class="cb-dkey">${c.key} ${modeName}</span>
              ${g ? `<span class="cb-dgenre">${g.title}</span>` : ''}
            </div>
            ${pr ? `<div class="cb-dprog">${pr.name} <em>${pr.tag}</em></div>` : ''}
            <button class="cb-go" onclick="Comeback.startChallenge()">
              ${doneToday ? L('Play it again', 'Vuelve a tocarlo') : L('Start', 'Empezar')}
            </button>
          </div>
        </div>
      </div>`;

    e.hidden = false;
    if (typeof applyIcons === 'function') applyIcons(e);
    requestAnimationFrame(() => e.classList.add('cb-on'));
    if (typeof OverlayManager === 'object') OverlayManager.opened('comeback');
    if (typeof tel === 'function')
      tel('comeback_shown', { projects: list.length, doneToday: !!doneToday, visits: st.visits || 0 });
  }

  function close() {
    const e = el(); if (!e) return;
    e.classList.remove('cb-on');
    setTimeout(() => { e.hidden = true; }, 260);
  }

  return { maybeShow, open, close, resume, startChallenge, challenge, shouldShow };
})();
