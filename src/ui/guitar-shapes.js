// ── GUITAR SHAPES ─────────────────────────────────────
// Box-notation chord diagrams for the guitar fretboard, shown in a scroll strip
// below the fretboard. Two views: full chord voicings (open / barre / high) and
// compact triads on the top-3 strings (root / 1st / 2nd inversion).
const GuitarShapes = (() => {
  const ENH = {Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
  const NI  = {C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
  // Open-string pitch classes, low→high: E A D G B e
  const TUNE = [4, 9, 2, 7, 11, 4];

  // Bilingual labels (EN/ES) for the segmented control and voicing captions.
  const LBL = {
    chords: {en:'Chords', es:'Acordes'}, triads: {en:'Triads', es:'Tríadas'}, prog: {en:'Progression', es:'Progresión'},
    open: {en:'Open', es:'Abierto'}, barreE: {en:'Barre E', es:'Cejilla Mi'}, barreA: {en:'Barre A', es:'Cejilla La'}, high: {en:'High', es:'Aguda'},
    root: {en:'Root', es:'Fund.'}, inv1: {en:'1st inv', es:'1ª inv'}, inv2: {en:'2nd inv', es:'2ª inv'},
    emptyProg: {en:'Add chords to your progression to see them here', es:'Añade acordes a tu progresión para verlos aquí'},
  };
  const T = k => { const o = LBL[k]; return o ? (o[st.lang] || o.en) : k; };

  // Barre shape generators → [e6, a5, d4, g3, b2, e1] fret positions.
  const eM = f => [f,  f+2, f+2, f+1, f,   f  ];  // E-shape major
  const aM = f => [-1, f,   f+2, f+2, f+2, f  ];  // A-shape major
  const em = f => [f,  f+2, f+2, f,   f,   f  ];  // E-shape minor
  const am = f => [-1, f,   f+2, f+2, f+1, f  ];  // A-shape minor

  const EF = r => (NI[r] - 4 + 12) % 12;   // root fret on low-E string
  const AF = r => (NI[r] - 9 + 12) % 12;   // root fret on A string

  // Idiomatic open voicings (differ from the pure barre formula).
  const SPEC = {
    'C:maj':[-1,3,2,0,1,0], 'A:maj':[-1,0,2,2,2,0], 'G:maj':[3,2,0,0,0,3],
    'E:maj':[0,2,2,1,0,0],  'D:maj':[-1,-1,0,2,3,2],
    'A:min':[-1,0,2,2,1,0], 'E:min':[0,2,2,0,0,0],  'D:min':[-1,-1,0,2,3,1],
  };

  const keyOf = fr => fr.join(',');

  // ── Full chord voicings ───────────────────────────
  function chordVoicings(root, qual) {
    const r = ENH[root] || root;
    const out = [], seen = new Set();
    const add = (fr, label) => {
      if (!fr || Math.max(...fr) > 16) return;
      const k = keyOf(fr); if (seen.has(k)) return;
      seen.add(k); out.push({ frets: fr, label });
    };
    if (SPEC[`${r}:${qual}`]) add(SPEC[`${r}:${qual}`], T('open'));
    const ef = EF(r), af = AF(r);
    const sE = qual === 'min' ? em : eM, sA = qual === 'min' ? am : aM;
    add(sE(ef === 0 ? 12 : ef), T('barreE'));
    add(sA(af === 0 ? 12 : af), T('barreA'));
    if (af + 12 <= 14) add(sA(af + 12), T('high'));
    else if (ef + 12 <= 14) add(sE(ef + 12), T('high'));
    return out.slice(0, 4);
  }

  // ── Triads on the top-3 strings (G, B, e) ─────────
  function triadVoicings(root, qual) {
    const r = ENH[root] || root, rootPC = NI[r];
    const iv = qual === 'min' ? [0, 3, 7] : qual === 'dim' ? [0, 3, 6] : [0, 4, 7];
    const triad = new Set(iv.map(x => (rootPC + x) % 12));
    const S = [3, 4, 5];                              // string indices g, b, e
    const found = [], seen = new Set();
    for (let pos = 0; pos <= 13; pos++) {
      const opts = S.map(si => {
        const o = [];
        for (let f = pos; f < pos + 4 && f <= 16; f++)
          if (triad.has((TUNE[si] + f) % 12)) o.push(f);
        return o;
      });
      if (opts.some(o => !o.length)) continue;
      for (const fg of opts[0]) for (const fb of opts[1]) for (const fe of opts[2]) {
        const pcs = new Set([(TUNE[3]+fg)%12, (TUNE[4]+fb)%12, (TUNE[5]+fe)%12]);
        if (pcs.size !== 3) continue;                 // need all three distinct tones
        if (Math.max(fg, fb, fe) - Math.min(fg, fb, fe) > 3) continue;
        const fr = [-1, -1, -1, fg, fb, fe];
        const k = keyOf(fr); if (seen.has(k)) continue;
        seen.add(k);
        // Inversion from the lowest-sounding note (G string).
        const lowPC = (TUNE[3] + fg) % 12;
        const lbl = lowPC === rootPC ? T('root')
                  : lowPC === (rootPC + iv[1]) % 12 ? T('inv1') : T('inv2');
        found.push({ frets: fr, label: lbl, _min: Math.min(fg, fb, fe) });
      }
    }
    found.sort((a, b) => a._min - b._min);
    return found.slice(0, 4);
  }

  // ── SVG box diagram (grid + dots; root marked with a hollow centre) ──
  function drawSVG(frets, rootPC) {
    const W = 62, H = 70, X0 = 9, X1 = 53, Y0 = 9, Y1 = 60, FR = 4, NS = 6;
    const sx = i => X0 + (X1 - X0) * i / (NS - 1);
    const fy = f => Y0 + (Y1 - Y0) * f / FR;
    const active = frets.filter(f => f > 0);
    const minF = active.length ? Math.min(...active) : 0;
    const base = minF <= 1 ? 0 : minF - 1;
    const nut = base === 0;
    const fg = 'var(--fg)';
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    if (!nut)
      s += `<text x="2" y="${fy(0.95)}" font-size="7" fill="var(--muted)" font-family="DM Mono,monospace">${base + 1}</text>`;
    // Nut or top boundary
    s += nut
      ? `<line x1="${sx(0)}" y1="${fy(0)}" x2="${sx(NS-1)}" y2="${fy(0)}" stroke="${fg}" stroke-width="2.4" stroke-linecap="round"/>`
      : `<line x1="${sx(0)}" y1="${fy(0)}" x2="${sx(NS-1)}" y2="${fy(0)}" stroke="${fg}" stroke-opacity="0.22" stroke-width="0.7"/>`;
    for (let f = 1; f <= FR; f++)
      s += `<line x1="${sx(0)}" y1="${fy(f)}" x2="${sx(NS-1)}" y2="${fy(f)}" stroke="${fg}" stroke-opacity="0.16" stroke-width="0.6"/>`;
    for (let i = 0; i < NS; i++)
      s += `<line x1="${sx(i)}" y1="${fy(0)}" x2="${sx(i)}" y2="${fy(FR)}" stroke="${fg}" stroke-opacity="${0.16 + (NS-1-i)*0.03}" stroke-width="${0.5 + (NS-1-i)*0.13}"/>`;
    // Open / muted indicators above the nut
    frets.forEach((f, i) => {
      const x = sx(i);
      if (f === -1)
        s += `<text x="${x}" y="${fy(0)-3}" text-anchor="middle" font-size="7.5" fill="var(--muted)">×</text>`;
      else if (f === 0)
        s += `<circle cx="${x}" cy="${fy(0)-5.5}" r="2.6" fill="none" stroke="var(--accent)" stroke-width="1.2"/>`;
    });
    // Fingered dots — root gets a hollow centre to stand out.
    frets.forEach((f, i) => {
      if (f <= 0) return;
      const df = f - base;
      if (df < 1 || df > FR) return;
      const cx = sx(i), cy = fy(df - 0.5);
      const isRoot = ((TUNE[i] + f) % 12) === rootPC;
      s += `<circle cx="${cx}" cy="${cy}" r="4.4" fill="var(--accent)"/>`;
      if (isRoot) s += `<circle cx="${cx}" cy="${cy}" r="1.7" fill="#fff"/>`;
    });
    s += '</svg>';
    return s;
  }

  // ── Mini horizontal fretboard (matches the big board's orientation) ──
  // Strings as rows (high-e on top, low-E at bottom), frets left→right. Cleaner
  // and consistent with the real fretboard, so the small + big read the same.
  function drawMiniFret(frets, rootPC) {
    const W = 118, H = 58, x0 = 16, x1 = 112, y0 = 7, y1 = 51, NS = 6, NF = 5;
    const active = frets.filter(f => f > 0);
    const minF = active.length ? Math.min(...active) : 0;
    const base = minF <= 1 ? 0 : minF - 1;          // leftmost shown fret
    const nut = base === 0;
    const sy = i => y0 + (y1 - y0) * i / (NS - 1);   // row (i=0 top = high e)
    const fx = f => x0 + (x1 - x0) * f / NF;
    const fg = 'var(--fg)';
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    if (!nut) s += `<text x="2" y="${sy(5) + 3}" font-size="7" fill="var(--muted)" font-family="DM Mono,monospace">${base + 1}</text>`;
    for (let i = 0; i < NS; i++)                      // string rows (bass thicker)
      s += `<line x1="${x0}" y1="${sy(i)}" x2="${x1}" y2="${sy(i)}" stroke="${fg}" stroke-opacity="0.3" stroke-width="${0.5 + i * 0.16}"/>`;
    for (let f = 0; f <= NF; f++) {                   // fret columns (nut thick)
      const isNut = nut && f === 0;
      s += `<line x1="${fx(f)}" y1="${sy(0)}" x2="${fx(f)}" y2="${sy(5)}" stroke="${fg}" stroke-opacity="${isNut ? 0.85 : 0.15}" stroke-width="${isNut ? 2.4 : 0.7}" stroke-linecap="round"/>`;
    }
    for (let i = 0; i < NS; i++) {                    // markers + dots
      const f = frets[5 - i], y = sy(i);
      if (f === -1) { s += `<text x="${x0 - 7}" y="${y + 2.6}" text-anchor="middle" font-size="7.5" fill="var(--muted)">×</text>`; continue; }
      if (f === 0)  { s += `<circle cx="${x0 - 7}" cy="${y}" r="2.5" fill="none" stroke="var(--accent)" stroke-width="1.1"/>`; continue; }
      const df = f - base; if (df < 1 || df > NF) continue;
      const cx = fx(df - 0.5);
      const isRoot = ((TUNE[5 - i] + f) % 12) === rootPC;
      s += `<circle cx="${cx}" cy="${y}" r="4.2" fill="var(--accent)"/>`;
      if (isRoot) s += `<circle cx="${cx}" cy="${y}" r="1.6" fill="#fff"/>`;
    }
    s += '</svg>';
    return s;
  }

  // ── State ─────────────────────────────────────────
  let _view = 'chords', _chords = [], _sel = [], _activePos = -1;
  const isOpen = () => !!document.getElementById('guitarShapeStrip')?.classList.contains('gss-on');
  const clampi = (v, max) => Math.max(0, Math.min(v, max));
  const _voicingsFor = c => c ? (_view === 'triads' ? triadVoicings(c.root, c.qual) : chordVoicings(c.root, c.qual)) : [];

  // De-duplicated chord list — each unique chord once (order of first appearance).
  // From the progression if there is one; otherwise the single current chord.
  function _collectChords() {
    const h = Array.isArray(st.history) ? st.history : [];
    const list = [], seen = new Set();
    const push = (rootName, qual, name) => {
      const r = ENH[rootName] || rootName, key = r + ':' + qual;
      if (seen.has(key)) return; seen.add(key);
      list.push({ name, root: rootName, qual, rootPC: NI[r] ?? 0 });
    };
    if (h.length) {
      h.forEach(it => {
        const rootName = (typeof chordRootOf === 'function') ? chordRootOf(it) : String(it.chord || 'C').replace(/m$|°$/, '');
        const qual = it.quality === 'Min' ? 'min' : it.quality === 'Dim' ? 'dim' : 'maj';
        push(rootName, qual, it.chord);
      });
    } else {
      let root, qual;
      if (typeof ChordVariants === 'object' && ChordVariants.ctx && ChordVariants.ctx.root) {
        root = ChordVariants.ctx.root; qual = /min/i.test(ChordVariants.ctx.quality) ? 'min' : /dim/i.test(ChordVariants.ctx.quality) ? 'dim' : 'maj';
      } else {
        root = st.key; qual = (typeof modeIsMinor === 'function' && modeIsMinor(st.mode)) ? 'min' : 'maj';
      }
      push(root, qual, root + (qual === 'min' ? 'm' : qual === 'dim' ? '°' : ''));
    }
    return list;
  }

  function _cardHTML(c, pos) {
    const vs = _voicingsFor(c);
    const sel = clampi(_sel[pos] || 0, Math.max(0, vs.length - 1));
    const dots = vs.length > 1
      ? `<div class="gsc-dots">${vs.map((_, i) => `<span class="gsc-dot${i === sel ? ' on' : ''}" onclick="event.stopPropagation();GuitarShapes.setVoicing(${pos},${i})"></span>`).join('')}</div>`
      : `<div class="gsc-dots"></div>`;
    const diag = vs.length ? drawMiniFret(vs[sel].frets, c.rootPC) : '<div class="gss-empty">—</div>';
    return `<div class="gss-card${pos === _activePos ? ' gss-active' : ''}" data-pos="${pos}" role="button"
              onpointerdown="GuitarShapes.cardDown(event,${pos})">
        <div class="gsc-name">${c.name}</div>
        ${dots}
        <div class="gsc-diag">${diag}</div>
        <div class="gsc-pos">${vs.length ? vs[sel].label : ''}</div>
      </div>`;
  }

  function _render() {
    const el = document.getElementById('guitarShapeStrip'); if (!el) return;
    _chords = _collectChords();
    if (!_chords.length) { el.classList.remove('gss-on'); return; }
    if (_activePos >= _chords.length) _activePos = -1;
    const seg = (vw, label) => `<button class="${_view === vw ? 'on' : ''}" role="tab" onclick="GuitarShapes.view('${vw}')">${label}</button>`;
    el.innerHTML = `
      <div class="gss-head">
        <span class="gss-title">${T('prog')}</span>
        <div class="gss-seg" role="tablist">${seg('chords', T('chords'))}${seg('triads', T('triads'))}</div>
        <button class="gss-x" onclick="GuitarShapes.close()" aria-label="×">×</button>
      </div>
      <div class="gss-scroll">${_chords.map((c, pos) => _cardHTML(c, pos)).join('')}</div>`;
    el.classList.add('gss-on');
  }

  // Update one card in place (no full rebuild → keeps horizontal scroll on slide).
  function _updateCard(pos) {
    const card = document.querySelector(`.gss-card[data-pos="${pos}"]`); if (!card) return;
    const c = _chords[pos]; if (!c) return;
    const vs = _voicingsFor(c), sel = clampi(_sel[pos] || 0, Math.max(0, vs.length - 1));
    const diag = card.querySelector('.gsc-diag'); if (diag) diag.innerHTML = vs.length ? drawMiniFret(vs[sel].frets, c.rootPC) : '—';
    card.querySelectorAll('.gsc-dot').forEach((d, i) => d.classList.toggle('on', i === sel));
    const posEl = card.querySelector('.gsc-pos'); if (posEl) posEl.textContent = vs.length ? vs[sel].label : '';
  }

  // Light a chord's current voicing big on the real fretboard + mark its card.
  function _highlightCard(pos) {
    const c = _chords[pos]; if (!c) return;
    const vs = _voicingsFor(c), sel = clampi(_sel[pos] || 0, Math.max(0, vs.length - 1));
    _activePos = pos;
    if (typeof highlightGuitarShape === 'function') highlightGuitarShape(vs[sel] ? vs[sel].frets : null);
    document.querySelectorAll('.gss-card').forEach(card => card.classList.toggle('gss-active', +card.dataset.pos === pos));
  }

  return {
    toggle() {
      if (isOpen()) { this.close(); return; }
      _view = 'chords'; _sel = []; _activePos = -1;
      _render();
      if (typeof OverlayManager === 'object') OverlayManager.opened('guitar-shapes');
    },

    // Switch voicing type (full chords vs triads) for all cards.
    view(v) { if (v !== _view) { _view = v; _sel = []; _render(); if (_activePos >= 0) _highlightCard(_activePos); } },

    // Dots → pick a specific voicing for one chord.
    setVoicing(pos, i) { _sel[pos] = i; _updateCard(pos); _highlightCard(pos); },

    // Pointer on a card: a sideways drag cycles that chord's voicings (low→high);
    // a tap (no drag) lights the chord's current shape big on the fretboard.
    cardDown(e, pos) {
      const startX = e.clientX;
      const up = ev => {
        window.removeEventListener('pointerup', up);
        const dx = ev.clientX - startX;
        const vs = _voicingsFor(_chords[pos]);
        if (Math.abs(dx) > 24 && vs.length > 1) {
          let sel = (_sel[pos] || 0) + (dx < 0 ? 1 : -1);
          _sel[pos] = Math.max(0, Math.min(vs.length - 1, sel));
          _updateCard(pos); _highlightCard(pos);
        } else {
          _highlightCard(pos);
        }
      };
      window.addEventListener('pointerup', up);
    },

    // A builder bar was tapped → highlight the matching chord card.
    hint(root, qual) {
      if (!isOpen() || !root) return;
      const r = ENH[root] || root, q = /min/i.test(qual) ? 'min' : /dim/i.test(qual) ? 'dim' : 'maj';
      _render();
      const idx = _chords.findIndex(c => (ENH[c.root] || c.root) === r && c.qual === q);
      if (idx >= 0) _highlightCard(idx);
    },

    // Progression changed → rebuild cards (keeps the active highlight if still valid).
    onProgressionChange() { if (isOpen()) { _render(); if (_activePos >= 0 && _activePos < _chords.length) _highlightCard(_activePos); } },
    // Language changed → relabel.
    refresh() { if (isOpen()) _render(); },

    close() {
      _activePos = -1;
      document.getElementById('guitarShapeStrip')?.classList.remove('gss-on');
      if (typeof highlightGuitarShape === 'function') highlightGuitarShape(null);
    },
  };
})();
