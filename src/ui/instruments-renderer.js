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
// Mark the active instrument on the island's piano/guitar tabs.
function _setInstrUI(which) {
  st.instr = which; saveState();
  document.querySelectorAll('.instr-tab').forEach(b => b.classList.toggle('on', b.dataset.instr === which));
  const ico = document.getElementById('tbInstrIco');
  if (ico && typeof setIcon === 'function') setIcon(ico, which === 'guitar' ? 'guitar' : 'piano');
  // Mobile island: the Shapes toggle in the sheet-head is guitar-only.
  document.body.classList.toggle('instr-on-guitar', which === 'guitar');
}
function _instrPager() { return document.querySelector('.instr-pager'); }

// Keep the tabs in sync when the pager is swiped between instruments.
function _wireInstrPager() {
  const pager = _instrPager(); if (!pager || pager._wired) return;
  pager._wired = true;
  const sync = () => _setInstrUI(Math.round(pager.scrollLeft / Math.max(pager.clientWidth, 1)) >= 1 ? 'guitar' : 'piano');
  pager.addEventListener('scrollend', sync);
  let t; pager.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(sync, 120); }, { passive: true });
}

// Piano/guitar tab → show that board. On phones the two live in a swipeable pager
// inside the island; on desktop they're tab-like drawers in the panel.
function gotoInstrument(which) {
  const drawers = document.querySelectorAll('.drawers .drawer');
  const piano = drawers[0], guitar = drawers[1];
  // In Instrument mode the board is the page at every width, so the phone's
  // swipe pager (which needs both drawers open) would show the wrong one.
  const paged = matchMedia('(max-width:860px)').matches
             && document.body.dataset.mode !== 'instrument';
  if (paged) {
    if (piano)  piano.open  = true;
    if (guitar) guitar.open = true;
    _wireInstrPager();
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
  // Instrument mode is a page: everything the guitarist came for is ALREADY
  // deployed — the neck, and the finger diagrams under it. No tap to reveal.
  if (document.body.dataset.mode === 'instrument' && typeof GuitarShapes === 'object') {
    if (which === 'guitar') GuitarShapes.show();
    else GuitarShapes.close();
  }
}

// ── Progression strip (inside the instrument island) ──────
// Your built chords as tappable chips; tapping one lights it on the piano (and
// guitar) and plays it — so you can audition each chord without leaving the
// instrument. Gives the piano the same fluency as the guitar's shapes view.
function renderInstrProgStrip() {
  // Two homes since V6.26: the transport island, and the header of the
  // Instrument mode. Same markup, so strip.pick keeps working in both.
  const els = ['tsProgStrip', 'instrStrip'].map(id => document.getElementById(id)).filter(Boolean);
  if (!els.length) return;
  const h = Array.isArray(st.history) ? st.history : [];
  // Empty document → the key's chords instead of stale copy. (The old message
  // said "tap a suggestion bubble below"; the bubbles moved tabs in V6.26.)
  const html = !h.length
    ? gc().map((c, i) => `<button class="tps-chip key" data-act="strip.pickKey" data-idx="${i}"
        title="${c.degree}">${c.chord}</button>`).join('')
    : h.map((it, i) => {
        const lbl = (typeof chordDisplay === 'function') ? chordDisplay(it) : it.chord;
        return `<button class="tps-chip" data-i="${i}" data-act="strip.pick" data-idx="${i}">${lbl}</button>`;
      }).join('');
  els.forEach(el => { el.innerHTML = html; });
}
function pickKeyChord(i) {
  const pcs = (typeof chordPitchesForDegree === 'function') ? chordPitchesForDegree(i) : null;
  if (!pcs) return;
  setActiveChord(pcs);
  if (typeof AudioEngine === 'object') AudioEngine.playChord(pcs);
  document.querySelectorAll('.tps-chip.key').forEach((c, k) => c.classList.toggle('on', k === i));
}

function pickProgChord(i) {
  const h = Array.isArray(st.history) ? st.history : []; const it = h[i]; if (!it) return;
  const pcs = (typeof chordPitchesForItem === 'function') ? chordPitchesForItem(it) : null;
  setActiveChord(pcs);
  if (pcs && typeof AudioEngine === 'object') AudioEngine.playChord(pcs);
  document.querySelectorAll('.tps-chip').forEach(c => c.classList.toggle('on', +c.dataset.i === i));
}


function _hear(pitch)       { if (typeof AudioEngine === 'object') AudioEngine.playNote(pitch, 0.9); }
function _hearGuitar(pitch) { if (typeof AudioEngine === 'object') AudioEngine.playGuitarNote(pitch); }

// Instrument voice for chord/piano playback: piano · epiano · brass · pack voices.
function setVoice(s, btn) {
  const pid = (typeof voicePackId === 'function') ? voicePackId(s) : null;
  if (pid && !packOwned(pid)) {   // future paid pack: refuse politely
    if (typeof _shareToast === 'function') {
      const nm = (PACKS[pid].name[st.lang] || PACKS[pid].name.en);
      _shareToast(st.lang === 'es' ? `Incluido en ${nm}` : `Included in ${nm}`);
    }
    return;
  }
  st.pianoSound = s; saveState();
  // Selecting a pack voice starts its lazy sample load right away.
  if (s === 'steel'    && typeof SampleSteel === 'object'    && AudioEngine.ctx) SampleSteel.ensure();
  if (s === 'electric' && typeof SampleElectric === 'object' && AudioEngine.ctx) SampleElectric.ensure();
  _syncVoiceUI();
  if (typeof AudioEngine === 'object') { if (AudioEngine.resume) AudioEngine.resume(); AudioEngine.playChord([0, 4, 7]); }
}
function _syncVoiceUI() {
  const s = (typeof st === 'object' && st.pianoSound) || 'piano';
  document.querySelectorAll('.snd-btn').forEach(b => b.classList.toggle('on', b.dataset.snd === s));
}

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
}

// InstrumentZoom retired in V6.34 — Instrument mode is the full-size board.

// ── Identify mode (V6.33) — "¿qué acorde es este?" ───
// The board flips from telling you where notes are to LISTENING to where your
// fingers are: overlays clear, every position becomes tappable, and the chord
// the selection spells is named live (with slash basses, ranked candidates).
const ChordIdent = {
  on: false,
  sel: new Map(),                       // "ti:fret" → absolute pitch
  toggle() {
    this.on = !this.on;
    if (!this.on) this.sel.clear();
    document.body.classList.toggle('ident-on', this.on);
    tel('ident_toggle', { on: this.on });
    // Shapes and identify fight for the same board.
    if (this.on && typeof GuitarShapes === 'object') GuitarShapes.close();
    else if (!this.on && document.body.dataset.mode === 'instrument'
             && (st.instr || 'piano') === 'guitar' && typeof GuitarShapes === 'object') GuitarShapes.show();
    renderGuitar();
  },
  clear() { this.sel.clear(); renderGuitar(); },
  tap(key, pitch) {
    if (this.sel.has(key)) this.sel.delete(key);
    else { this.sel.set(key, pitch); _hearGuitar(pitch); }
    haptic('sel');
    this._readout();
  },
  names() { return ChordNamer.name([...this.sel.values()]); },
  _readout() {
    const el = document.getElementById('identBar'); if (!el) return;
    el.innerHTML = this._readoutHTML();
    // re-mark the dots without a full rebuild (rebuild would drop touch focus)
    document.querySelectorAll('.fret-note.ident').forEach(d =>
      d.classList.toggle('sel', this.sel.has(d.dataset.ik)));
  },
  _readoutHTML() {
    const es = st.lang === 'es';
    const n = this.sel.size;
    if (!n) return `<span class="ib-hint">${es ? 'Toca las notas de tu acorde en el mástil' : 'Tap the notes of your chord on the neck'}</span>`;
    const names = this.names();
    const notes = [...this.sel.values()].sort((a, b) => a - b)
      // Raw sharp names on purpose: dn() respells to the ACTIVE KEY's signature,
      // and identify mode is key-agnostic — Ab next to an E chord reads wrong.
      .map(p => ChordNamer.NAMES[((p % 12) + 12) % 12]).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
    if (!names.length) return `<span class="ib-notes">${notes}</span>
      <span class="ib-hint">${es ? 'aún sin nombre — sigue añadiendo' : 'no name yet — keep adding'}</span>`;
    const [best, ...alts] = names;
    return `<span class="ib-notes">${notes}</span>
      <b class="ib-best">${best.name}</b>
      ${alts.slice(0, 2).map(a => `<span class="ib-alt">${a.name}</span>`).join('')}
      <button class="ib-clear" data-act="ident.clear">${es ? 'limpiar' : 'clear'}</button>`;
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
  const ident = typeof ChordIdent === 'object' && ChordIdent.on
             && document.body.dataset.mode === 'instrument';

  // Identify mode: readout bar above the neck.
  if (ident) {
    const bar = document.createElement('div');
    bar.id = 'identBar'; bar.className = 'ident-bar';
    bar.innerHTML = ChordIdent._readoutHTML();
    root.parentElement?.parentElement?.querySelector('.ident-bar')?.remove();
    root.parentElement?.parentElement?.insertBefore(bar, root.parentElement);
  } else {
    document.querySelector('.ident-bar')?.remove();
  }
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
    if (ident) {
      const key = `${ti}:0`;
      od.className = 'fret-note ident' + (ChordIdent.sel.has(key) ? ' sel' : '');
      od.dataset.ik = key;
      od.textContent = dn(on);
      od.onclick = () => ChordIdent.tap(key, base);
      nc.appendChild(od);
      row.appendChild(nc);
      // strings render below; skip the normal nut branches
    } else if (_activeShape) {
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
    if (!ident) {
      od.onclick = () => _hearGuitar(base);
      nc.appendChild(od);
      row.appendChild(nc);
    }
    for (let f = 1; f <= FRETS; f++) {
      const n = na(start + f); const isO = sc.has(n); const isR = n === rootNote; const isC = inChord(start + f);
      const cell = document.createElement('div');
      cell.className = 'fret-cell';
      if (ident) {
        const key = `${ti}:${f}`, pitch = base + f;
        const dot = document.createElement('div');
        dot.className = 'fret-note ident' + (ChordIdent.sel.has(key) ? ' sel' : '');
        dot.dataset.ik = key;
        dot.textContent = dn(n);
        dot.onclick = () => ChordIdent.tap(key, pitch);
        cell.appendChild(dot);
        row.appendChild(cell);
        continue;
      }
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
}
