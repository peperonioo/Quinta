// ── INSTRUMENTS RENDERER ──────────────────────────────
// The chord whose tones light up on the piano / fretboard. An explicitly set
// "active chord" (e.g. a 7/sus/add variant from the chooser) wins, so the boards
// become a visual guide for building the *exact* altered chord. Otherwise it
// falls back to the triad of the selected wheel degree.
let _activeChordPcs = null;
function setActiveChord(pitches) {
  _activeChordPcs = (pitches && pitches.length) ? pitches.map(p => ((p % 12) + 12) % 12) : null;
  renderPiano(); renderGuitar();
}

// When a specific chord shape is selected in GuitarShapes, highlight only those 6 fret positions.
// shape = [e6, a5, d4, g3, b2, e1] fret array; null = revert to full chord-tone display.
let _activeShape = null;
function highlightGuitarShape(shape) {
  _activeShape = shape;
  renderGuitar();
  if (shape) requestAnimationFrame(centreFretboardOnShape);   // follow the notes — no manual scroll
}

// Scroll the fretboard so the lit voicing sits in the middle of the view. Saves
// the user chasing a shape that's far up the neck when they slide voicings.
function centreFretboardOnShape() {
  const wrap = document.querySelector('.fretboard-wrap'); if (!wrap) return;
  const dots = wrap.querySelectorAll('.shape-dot'); if (!dots.length) return;
  const wr = wrap.getBoundingClientRect();
  let sum = 0;
  dots.forEach(d => { const r = d.getBoundingClientRect(); sum += r.left + r.width / 2 - wr.left + wrap.scrollLeft; });
  const centre = sum / dots.length;
  const target = Math.max(0, Math.min(centre - wrap.clientWidth / 2, wrap.scrollWidth - wrap.clientWidth));
  wrap.scrollTo({ left: target, behavior: 'smooth' });
}
function _chordPcSet() {
  if (_activeChordPcs) return new Set(_activeChordPcs);
  if (typeof curDeg === 'undefined' || curDeg < 0 || typeof chordPitchesForDegree !== 'function') return null;
  const pcs = chordPitchesForDegree(curDeg);
  if (!pcs || !pcs.length) return null;
  return new Set(pcs.map(p => ((p % 12) + 12) % 12));
}
// Mark the active instrument across the dock + the sheet's page dots (no scroll).
function _setInstrUI(which) {
  document.querySelectorAll('.instr-dock-btn').forEach(b => b.classList.toggle('on', b.dataset.instr === which));
  document.querySelectorAll('.sheet-dots i').forEach(d => d.classList.toggle('on', d.dataset.instr === which));
}
function _instrPager() { return document.querySelector('.instr-pager'); }

// Keep the dock + dots in sync when the user swipes the pager between instruments.
function _wireInstrPager() {
  const pager = _instrPager(); if (!pager || pager._wired) return;
  pager._wired = true;
  const sync = () => _setInstrUI(Math.round(pager.scrollLeft / Math.max(pager.clientWidth, 1)) >= 1 ? 'guitar' : 'piano');
  pager.addEventListener('scrollend', sync);
  let t; pager.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(sync, 120); }, { passive: true });
}

// Floating dock / page dots → jump to an instrument. On phones the two boards are
// a swipeable pager inside the bottom-sheet; on desktop they're tab-like drawers.
function gotoInstrument(which) {
  const mobile = matchMedia('(max-width:860px)').matches;
  // Tapping the already-active instrument while the sheet is open dismisses it.
  if (mobile && document.body.classList.contains('instr-sheet')
      && document.querySelector('.instr-dock-btn.on')?.dataset.instr === which) {
    closeInstrSheet(); return;
  }
  const drawers = document.querySelectorAll('.drawers .drawer');
  const piano = drawers[0], guitar = drawers[1];
  if (mobile) {
    // Both panels live in the pager — render both, slide the sheet up, page across.
    if (piano)  piano.open  = true;
    if (guitar) guitar.open = true;
    _wireInstrPager();
    document.body.classList.add('instr-sheet');
    _setInstrUI(which);
    const pager = _instrPager();
    if (pager) requestAnimationFrame(() =>
      pager.scrollTo({ left: (which === 'guitar' ? 1 : 0) * pager.clientWidth, behavior: 'smooth' }));
  } else {
    const target = which === 'guitar' ? guitar : piano;
    const other  = which === 'guitar' ? piano  : guitar;
    if (other)  other.open  = false;
    if (target) target.open = true;
    _setInstrUI(which);
    requestAnimationFrame(() => target?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
}
function closeInstrSheet() { document.body.classList.remove('instr-sheet'); }

// Dot the dock's *other* instrument when a chord is highlighted, so it's obvious
// the selected chord is also shown there (piano ↔ guitar). The highlight lives on
// both boards at once — the sheet just shows one at a time, full-size.
function _updateDockChordHint() {
  document.getElementById('instrDock')?.classList.toggle('has-chord', _chordPcSet() != null);
}

function _hear(pitch)       { if (typeof AudioEngine === 'object') AudioEngine.playNote(pitch, 0.9); }
function _hearGuitar(pitch) { if (typeof AudioEngine === 'object') AudioEngine.playGuitarNote(pitch); }

function renderPiano() {
  const root = document.getElementById('piano'); if (!root) return;
  root.innerHTML = '';
  const set    = new Set(gr());                 // scale note names
  const chord  = _chordPcSet();
  const whites = ['C','D','E','F','G','A','B','C','D','E','F','G','A','B','C'];
  const wPitch = [0,2,4,5,7,9,11,12,14,16,17,19,21,23,24];
  const w      = 100 / whites.length;
  const cls = (pitch, n) => {
    if (chord && chord.has(((pitch % 12) + 12) % 12)) return ' chord-on';
    return set.has(n) ? ' key-on' : '';
  };
  const isCh = pitch => chord && chord.has(((pitch % 12) + 12) % 12);
  whites.forEach((n, i) => {
    const pitch = wPitch[i];
    const el = document.createElement('div');
    el.className = 'white' + cls(pitch, n);
    el.style.cssText = `left:${i*w}%;width:${w}%;position:absolute;bottom:0;top:0`;
    el.innerHTML = (set.has(n) || isCh(pitch)) ? `<span class="kl">${n}</span>` : '';
    el.onclick = () => _hear(pitch);
    root.appendChild(el);
  });
  [['C#',.72,1],['D#',1.72,3],['F#',3.72,6],['G#',4.72,8],['A#',5.72,10],
   ['C#',7.72,13],['D#',8.72,15],['F#',10.72,18],['G#',11.72,20],['A#',12.72,22]].forEach(([n, pos, pitch]) => {
    const el = document.createElement('div');
    el.className = 'black' + cls(pitch, n);
    el.style.cssText = `left:${pos*w}%;width:${w*.56}%;position:absolute;top:0;height:60%;z-index:2`;
    if (isCh(pitch)) el.innerHTML = `<span class="kl">${dn(n)}</span>`;
    el.onclick = () => _hear(pitch);
    root.appendChild(el);
  });
  _updateDockChordHint();
}

// ── Fullscreen / enlarge a board ──────────────────────
// Moves the live #piano / fretboard into a glass overlay (fullscreen on phones,
// large on desktop) so it's playable at a comfortable size. Registered with
// OverlayManager (Escape + backdrop click).
const InstrumentZoom = {
  open: false, which: null, _el: null, _parent: null,
  show(which) {
    const ov = document.getElementById('instrZoom'); if (!ov) return;
    const el = which === 'piano' ? document.getElementById('piano')
                                 : document.getElementById('guitar')?.closest('.fretboard-wrap');
    if (!el) return;
    this.which = which; this._el = el; this._parent = el.parentElement;
    const title = document.getElementById('instrZoomTitle');
    if (title) title.textContent = which === 'piano' ? t('drawers.piano') : t('drawers.guitar');
    const body = document.getElementById('instrZoomBody'); body.innerHTML = ''; body.appendChild(el);
    el.classList.add('zoom');
    ov.classList.add('open'); this.open = true;
    (which === 'piano' ? renderPiano : renderGuitar)();
    if (typeof OverlayManager === 'object') OverlayManager.opened('instr-zoom');
  },
  close() {
    if (!this.open) return;
    if (this._el && this._parent) { this._el.classList.remove('zoom'); this._parent.appendChild(this._el); }
    document.getElementById('instrZoom')?.classList.remove('open');
    const which = this.which;
    this.open = false; this._el = null; this._parent = null; this.which = null;
    (which === 'piano' ? renderPiano : renderGuitar)();
  },
};

function renderGuitar() {
  const root = document.getElementById('guitar'); if (!root) return;
  root.innerHTML = '';
  const sc       = new Set(gr());
  const chord    = _chordPcSet();
  const rootNote = gr()[0];
  // [name, pitch-class, absolute base pitch] high-E to low-E (0 = middle C).
  const tuning   = [['E',4,4],['B',11,-1],['G',7,-5],['D',2,-10],['A',9,-15],['E',4,-20]];
  const FRETS    = 17;
  const cols     = `40px repeat(${FRETS},1fr)`;

  const mR = document.createElement('div');
  mR.style.cssText = `display:grid;grid-template-columns:${cols};padding:4px 0 2px`;
  mR.appendChild(document.createElement('div'));
  for (let f = 1; f <= FRETS; f++) {
    const c = document.createElement('div');
    c.style.cssText = 'display:flex;align-items:center;justify-content:center;height:14px';
    if ([3,5,7,9,15].includes(f)) c.innerHTML = '<div style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.1)"></div>';
    if (f === 12) c.innerHTML = '<div style="display:flex;gap:4px"><div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.15)"></div><div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.15)"></div></div>';
    mR.appendChild(c);
  }
  root.appendChild(mR);

  const nR = document.createElement('div');
  nR.style.cssText = `display:grid;grid-template-columns:${cols};padding:0 0 2px`;
  nR.appendChild(document.createElement('div'));
  for (let f = 1; f <= FRETS; f++) {
    const c = document.createElement('div');
    c.style.cssText = 'text-align:center;font-size:8px;color:rgba(255,255,255,.14);font-family:DM Mono,monospace';
    if ([3,5,7,9,12,15,17].includes(f)) c.textContent = f;
    nR.appendChild(c);
  }
  root.appendChild(nR);

  const inChord = pc => chord && chord.has(((pc % 12) + 12) % 12);
  // _activeShape = [e6, a5, d4, g3, b2, e1]; tuning[0]=high-e → shape[5], tuning[5]=low-E → shape[0]
  tuning.forEach(([name, start, base], ti) => {
    const shapeFret = _activeShape ? _activeShape[5 - ti] : null; // fret for this string in active shape
    const row = document.createElement('div');
    row.style.cssText = `display:grid;grid-template-columns:${cols};align-items:center;border-top:1px solid rgba(255,255,255,.05);position:relative`;
    const sl = document.createElement('div');
    sl.style.cssText = 'position:absolute;left:40px;right:0;top:50%;height:1px;background:rgba(255,255,255,.13);pointer-events:none';
    row.appendChild(sl);
    const nc = document.createElement('div');
    nc.style.cssText = 'width:40px;display:flex;align-items:center;justify-content:center;height:32px;border-right:2px solid rgba(255,255,255,.2);position:relative;z-index:1';
    const on = na(start), isOn = sc.has(on), isRoot = on === rootNote, isCh = inChord(start);
    const od = document.createElement('div');
    if (_activeShape) {
      // Shape mode: nut column shows muted (×) or open-string indicator
      if (shapeFret === -1) {
        od.className = 'fret-note'; od.textContent = '×';
        od.style.cssText = 'background:transparent;color:rgba(255,255,255,.35);font-size:11px;width:20px;height:20px';
      } else if (shapeFret === 0) {
        od.className = 'fret-note' + (isCh ? ' chord' : isRoot ? ' root' : isOn ? ' on' : '');
        od.textContent = dn(on);
      } else {
        od.className = 'fret-note'; od.textContent = name;
        od.style.cssText = 'background:transparent;color:rgba(255,255,255,.15);font-size:9px;width:20px;height:20px';
      }
    } else {
      od.className = 'fret-note' + (isCh ? ' chord' : isRoot ? ' root' : isOn ? ' on' : '');
      od.textContent = isOn ? dn(on) : name;
      if (!isOn && !isCh) od.style.cssText = 'background:transparent;color:rgba(255,255,255,.18);font-size:9px;width:20px;height:20px';
    }
    od.onclick = () => _hearGuitar(base);
    nc.appendChild(od);
    row.appendChild(nc);
    for (let f = 1; f <= FRETS; f++) {
      const n = na(start + f); const isO = sc.has(n); const isR = n === rootNote; const isC = inChord(start + f);
      const cell = document.createElement('div');
      cell.className = 'fret-cell';
      if (_activeShape) {
        // Shape mode: only show the specific fret dot for this string
        if (shapeFret === f) {
          const dot = document.createElement('div');
          dot.className = 'fret-note chord shape-dot';
          dot.textContent = dn(n);
          dot.onclick = () => _hearGuitar(base + f);
          cell.appendChild(dot);
        }
      } else if (isO || isC) {
        const dot = document.createElement('div');
        dot.className = 'fret-note' + (isC ? ' chord' : isR ? ' root' : ' on');
        dot.textContent = dn(n);
        dot.onclick = () => _hearGuitar(base + f);
        cell.appendChild(dot);
      }
      row.appendChild(cell);
    }
    root.appendChild(row);
  });
  _updateDockChordHint();
}
