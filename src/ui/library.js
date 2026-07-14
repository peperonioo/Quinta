// ── PROGRESSION LIBRARY (V5.0) ────────────────────────
// Save / name / load multiple progressions (beyond the single live state) and
// load genre/style presets. Persisted in its own localStorage key. The panel is
// a floating dialog registered with OverlayManager (Escape + click-outside).

// Degree-based presets — applied in the CURRENT key/mode, so they transpose.
const PROG_PRESETS = [
  { name: 'I–V–vi–IV',        tag: 'Pop',       idx: [0, 4, 5, 3] },
  { name: 'vi–IV–I–V',        tag: 'Anthemic',  idx: [5, 3, 0, 4] },
  { name: 'I–vi–IV–V',        tag: '50s',       idx: [0, 5, 3, 4] },
  { name: 'ii–V–I',           tag: 'Jazz',      idx: [1, 4, 0] },
  { name: 'I–IV–V–I',         tag: 'Classic',   idx: [0, 3, 4, 0] },
  { name: 'i–♭VI–♭VII–i',     tag: 'Cinematic', idx: [0, 5, 6, 0] },
  { name: 'i–♭VII–♭VI–V',     tag: 'Andalusian',idx: [0, 6, 5, 4] },
  { name: '12-bar blues',     tag: 'Blues',     idx: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4] },
  { name: 'I–V–vi–iii–IV',    tag: 'Canon',     idx: [0, 4, 5, 2, 3, 0, 3, 4] },
  { name: 'I–vi–ii–V',        tag: 'Doo-wop',   idx: [0, 5, 1, 4] },
  { name: 'i–iv–v–i',         tag: 'Minor',     idx: [0, 3, 4, 0] },
  { name: 'I–IV–vi–V',        tag: 'Pop II',    idx: [0, 3, 5, 4] },
];

// "Surprise me" — drop a random, tonality-appropriate progression into the builder
// and play it. This is the instant-reward / 30-second value moment for a brand-new
// user: one tap and something musical is already sounding, before they learn a thing.
const SURPRISE_POOL = { major: [0, 1, 2, 3, 4, 7, 8, 9, 11], minor: [5, 6, 10] };
function surpriseMe(autoplay = true) {
  if (typeof PROG_PRESETS === 'undefined') return;
  if (typeof AudioEngine === 'object') AudioEngine.resume();       // unlock audio in this gesture
  const minor = (st.tonality === 'minor') || (typeof modeIsMinor === 'function' && modeIsMinor(st.mode));
  const pool = SURPRISE_POOL[minor ? 'minor' : 'major'];
  let i, guard = 0;
  do { i = pool[Math.floor(Math.random() * pool.length)]; } while (i === surpriseMe._last && pool.length > 1 && guard++ < 8);
  surpriseMe._last = i;
  const pr = PROG_PRESETS[i]; if (!pr) return;
  if (typeof snapshotAndOfferUndo === 'function') snapshotAndOfferUndo('undo.replaced');  // recover an accidental tap
  st.history = [];
  pr.idx.forEach(d => HistoryEngine.addDegree(d));
  saveState();
  RenderEngine.full();
  haptic('ok');
  if (typeof tel === 'function') tel('surprise', { preset: pr.name });
  if (autoplay) {
    if (typeof _progRAF !== 'undefined' && _progRAF && typeof stopProgression === 'function') stopProgression();
    if (typeof playProgression === 'function') setTimeout(playProgression, 110);
  }
}

const Library = {
  KEY: 'easy-fifth-circle:library',
  open: false,

  _read() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (_) { return []; } },
  _write(list) { try { localStorage.setItem(this.KEY, JSON.stringify(list)); } catch (_) {} },

  toggle() { this.open ? this.close() : this._show(); },
  _show() {
    const p = document.getElementById('libraryPanel'); if (!p) return;
    this.open = true;
    this.render();
    p.classList.add('open');
    document.getElementById('libraryBackdrop')?.classList.add('open');
    if (typeof OverlayManager === 'object') OverlayManager.opened('library');
    if (typeof FocusTrap === 'object') FocusTrap.activate(p);
    setTimeout(() => document.getElementById('libName')?.focus(), 60);
  },
  close() {
    this.open = false;
    const p = document.getElementById('libraryPanel');
    p?.classList.remove('open');
    document.getElementById('libraryBackdrop')?.classList.remove('open');
    if (typeof FocusTrap === 'object') FocusTrap.release(p);
  },

  saveCurrent() {
    const h = Array.isArray(st.history) ? st.history : [];
    if (!h.length) { _shareToast && _shareToast('Build a progression first'); return; }
    const input = document.getElementById('libName');
    const list = this._read();
    const name = (input && input.value.trim()) || `Progression ${list.length + 1}`;
    list.unshift({
      id: Date.now() + '-' + Math.random().toString(36).slice(2),
      name, key: st.key, mode: st.mode, tonality: st.tonality, bpm: st.bpm,
      history: JSON.parse(JSON.stringify(h)), ts: Date.now(),
    });
    this._write(list);
    if (input) input.value = '';
    this.render();
    if (typeof _shareToast === 'function') _shareToast('Saved');
  },

  remove(id) { this._write(this._read().filter(p => p.id !== id)); this.render(); },

  loadSaved(id) {
    const p = this._read().find(x => x.id === id); if (!p) return;
    if (typeof snapshotAndOfferUndo === 'function') snapshotAndOfferUndo('undo.replaced');
    st.key = p.key; st.mode = p.mode;
    st.tonality = p.tonality || (modeIsMinor(p.mode) ? 'minor' : 'major');
    if (p.bpm) st.bpm = p.bpm;
    st.history = JSON.parse(JSON.stringify(p.history || []));
    normalizeKeyState(); curDeg = -1; saveState();
    RenderEngine.full();
    if (typeof Metronome === 'object') Metronome.render();
    this.close();
  },

  // Apply a preset's degree sequence in the current key/mode.
  loadPreset(i) {
    const pr = PROG_PRESETS[i]; if (!pr) return;
    if (typeof snapshotAndOfferUndo === 'function') snapshotAndOfferUndo('undo.replaced');
    st.history = [];
    pr.idx.forEach(d => HistoryEngine.addDegree(d));
    saveState();
    RenderEngine.full();
    this.close();
  },

  // Chord names for a saved progression's stored items.
  _savedChords(p) {
    return (p.history || []).map(it => (typeof chordDisplay === 'function' ? chordDisplay(it) : it.chord));
  },
  // Chord names for a preset, in the current key/mode.
  _presetChords(pr) {
    const c = (typeof gc === 'function') ? gc() : [];
    return pr.idx.map(d => c[d]?.chord || '').filter(Boolean);
  },

  render() {
    const listEl = document.getElementById('libList');
    if (listEl) {
      const saved = this._read();
      listEl.innerHTML = saved.length ? saved.map(p => `
        <div class="lib-item">
          <button class="lib-load" onclick="Library.loadSaved('${p.id}')" title="Load">
            <span class="lib-name">${p.name}</span>
            <span class="lib-chords">${this._savedChords(p).join(' · ')}</span>
          </button>
          <button class="lib-del" data-ico="close" data-ico-size="11" onclick="Library.remove('${p.id}')" aria-label="Delete"></button>
        </div>`).join('')
        : `<div class="lib-empty">
            <span class="mini-q" aria-hidden="true"><i></i></span>
            <div class="le-title">${st.lang === 'es' ? 'Aún no hay progresiones guardadas' : 'No saved progressions yet'}</div>
            <div class="le-sub">${st.lang === 'es' ? 'Crea algo y pulsa Guardar — o empieza con un preset de abajo.' : 'Build something and hit Save — or start from a preset below.'}</div>
          </div>`;
    }
    const presetsEl = document.getElementById('libPresets');
    if (presetsEl) {
      presetsEl.innerHTML = PROG_PRESETS.map((pr, i) => `
        <button class="lib-item lib-preset" onclick="Library.loadPreset(${i})" title="Load in the current key">
          <span class="lib-name">${pr.name}<span class="lib-tag">${pr.tag}</span></span>
          <span class="lib-chords">${this._presetChords(pr).join(' · ')}</span>
        </button>`).join('');
    }
    if (typeof applyIcons === 'function') applyIcons(document.getElementById('libraryPanel'));
  },
};
