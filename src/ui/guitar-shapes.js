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

  // ── Curated movable chord shapes (CAGED) ───────────
  // Each shape is a REAL, idiomatic guitar voicing — an open-chord form made
  // movable (E/A/D anchor) — verified note-by-note against standard chord
  // references. Offsets are [s6,s5,s4,s3,s2,s1] from the anchor's root fret;
  // -1 = string muted. Keyed by the chord's interval SIGNATURE (semitones from
  // root, sorted) so the same notes always map to the same correct shapes,
  // independent of how the chord was named/spelled.
  const ANCHOR = { E: { open: 4, label: 'barreE' }, A: { open: 9, label: 'barreA' }, D: { open: 2, label: 'high' } };
  const X = null;   // muted string (distinct from a real negative fret offset)
  const SHAPES = {
    // ── Major family ──
    '0,4,7':      [['E',[0,2,2,1,0,0]],  ['A',[X,0,2,2,2,0]],  ['D',[X,X,0,2,3,2]]],   // major
    '0,4,7,11':   [['E',[0,2,1,1,0,0]],  ['A',[X,0,2,1,2,0]],  ['D',[X,X,0,2,2,2]]],   // maj7
    '0,4,7,10':   [['E',[0,2,0,1,0,0]],  ['A',[X,0,2,0,2,0]],  ['D',[X,X,0,2,1,2]]],   // dom7
    '0,4,7,9':    [['E',[0,2,2,1,2,0]],  ['A',[X,0,2,2,2,2]],  ['D',[X,X,0,2,0,2]]],   // 6
    '0,2,4,7':    [['E',[0,2,2,1,0,2]],  ['A',[X,0,-1,-3,0,-3]]],                      // add9
    '0,2,7':      [['A',[X,0,2,2,0,0]],  ['D',[X,X,0,2,3,0]]],                         // sus2
    '0,5,7':      [['E',[0,2,2,2,0,0]],  ['A',[X,0,2,2,3,0]],  ['D',[X,X,0,2,3,3]]],   // sus4
    '0,2,4,7,10': [['A',[X,0,-1,0,0,0]], ['E',[0,2,0,1,0,2]]],                         // 9
    // ── Minor family ──
    '0,3,7':      [['E',[0,2,2,0,0,0]],  ['A',[X,0,2,2,1,0]],  ['D',[X,X,0,2,3,1]]],   // minor
    '0,3,7,10':   [['E',[0,2,0,0,0,0]],  ['A',[X,0,2,0,1,0]],  ['D',[X,X,0,2,1,1]]],   // m7
    '0,2,3,7,10': [['E',[0,2,0,0,0,2]],  ['A',[X,0,-2,0,0,0]]],                        // m9
    '0,3,7,9':    [['A',[X,0,2,2,1,2]],  ['E',[0,2,2,0,2,0]],  ['D',[X,X,0,2,0,1]]],   // m6
    '0,2,3,7':    [['E',[0,2,2,0,0,2]]],                                              // m(add9)
    // ── Diminished family ──
    '0,3,6':      [['A',[X,0,1,2,1,X]],  ['E',[0,1,2,0,-1,0]]],                        // dim triad
    '0,3,6,10':   [['A',[X,0,1,0,1,X]],  ['E',[0,1,0,0,X,X]]],                         // m7♭5 (half-dim)
    '0,3,6,9':    [['A',[X,0,1,-1,1,2]]],                                            // dim7
  };

  // Idiomatic OPEN voicings for plain triads (clearer than a barre for beginners).
  const SPEC = {
    'C:maj':[-1,3,2,0,1,0], 'A:maj':[-1,0,2,2,2,0], 'G:maj':[3,2,0,0,0,3],
    'E:maj':[0,2,2,1,0,0],  'D:maj':[-1,-1,0,2,3,2],
    'A:min':[-1,0,2,2,1,0], 'E:min':[0,2,2,0,0,0],  'D:min':[-1,-1,0,2,3,1],
  };

  const keyOf = fr => fr.join(',');
  // Interval signature: sorted, unique semitones from root (mod 12).
  const sigOf = iv => [...new Set(iv.map(x => ((x % 12) + 12) % 12))].sort((a, b) => a - b).join(',');

  // Place a movable shape at the correct fret for `rootPC`. Bumps up an octave
  // so no string lands on a negative fret; drops an octave if it climbs off the
  // neck. The anchor string carries the root (its offset is 0 in every shape).
  function placeShape(name, off, rootPC) {
    const a = ANCHOR[name];
    let R = (rootPC - a.open + 12) % 12;
    const minOff = Math.min(...off.filter(o => o !== null));   // real offsets only (null = muted)
    while (R + minOff < 0) R += 12;
    let frets = off.map(o => o === null ? -1 : R + o);
    if (Math.max(...frets) > 15) {
      const lowered = off.map(o => o === null ? -1 : R - 12 + o);
      if (lowered.filter(f => f !== -1).every(f => f >= 0)) frets = lowered;
    }
    return frets;
  }

  // ── Full chord voicings ───────────────────────────
  function chordVoicings(root, qual, variant) {
    const r = ENH[root] || root, rootPC = NI[r] ?? 0;
    const out = [], seen = new Set();
    const add = (fr, label) => {
      if (!fr || fr.some(f => f > 16) || fr.filter(f => f >= 0).length < 3) return;
      const k = keyOf(fr); if (seen.has(k)) return;
      seen.add(k); out.push({ frets: fr, label });
    };
    // Resolve the chord's interval set from its variant (falls back to the triad).
    let iv;
    if (variant && variant !== 'triad' && typeof variantDef === 'function') {
      const Q = qual === 'min' ? 'Min' : qual === 'dim' ? 'Dim' : 'Maj';
      iv = variantDef(Q, variant).iv;
    } else {
      iv = qual === 'min' ? [0, 3, 7] : qual === 'dim' ? [0, 3, 6] : [0, 4, 7];
    }
    const sig = sigOf(iv);
    // Idiomatic open voicing first (plain triads only).
    if ((!variant || variant === 'triad') && SPEC[`${r}:${qual}`]) add(SPEC[`${r}:${qual}`], T('open'));
    // Curated movable shapes for this exact interval signature (fall back to the
    // plain triad if a signature has no table yet, so we never show wrong notes).
    const triadSig = sigOf(qual === 'min' ? [0, 3, 7] : qual === 'dim' ? [0, 3, 6] : [0, 4, 7]);
    const shapes = SHAPES[sig] || SHAPES[triadSig];
    shapes.forEach(([name, off]) => add(placeShape(name, off, rootPC), T(ANCHOR[name].label)));
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

  // ── Mini fretboard — a faithful small slice of the real board ──
  // A wood panel with visible strings (rows, high-e on top), frets (columns),
  // the nut, position inlays (3/5/7/9/12) and note-named dots. Reads instantly
  // as a fretboard rather than floating circles.
  const _noteName = pc => (typeof na === 'function') ? ((typeof dn === 'function') ? dn(na(pc)) : na(pc)) : '';
  let _mfN = 0;
  function drawMiniFret(frets, rootPC) {
    const W = 172, H = 92, x0 = 26, x1 = 162, y0 = 13, y1 = 79, NS = 6, NF = 5;
    const active = frets.filter(f => f > 0);
    const minF = active.length ? Math.min(...active) : 0;
    const base = minF <= 1 ? 0 : minF - 1;          // leftmost shown fret
    const nut = base === 0;
    const sy = i => y0 + (y1 - y0) * i / (NS - 1);   // string row (i=0 top = high e)
    const fx = f => x0 + (x1 - x0) * f / NF;
    const mid = (y0 + y1) / 2;
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    // Wood panel
    const gid = 'mfW' + (_mfN++);   // unique per diagram — fixed ids collide across cards
    s += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2010"/><stop offset="1" stop-color="#150e05"/></linearGradient></defs>`;
    s += `<rect x="${x0 - 3}" y="3" width="${W - (x0 - 3) - 3}" height="${H - 6}" rx="7" fill="url(#${gid})" stroke="rgba(255,255,255,.09)"/>`;
    // Position inlays (between/around strings) at standard frets within the window
    for (let f = 1; f <= NF; f++) {
      const abs = base + f, cx = fx(f - 0.5);
      if (abs === 12) { s += `<circle cx="${cx}" cy="${sy(1.5)}" r="2.4" fill="rgba(255,255,255,.16)"/><circle cx="${cx}" cy="${sy(3.5)}" r="2.4" fill="rgba(255,255,255,.16)"/>`; }
      else if ([3, 5, 7, 9, 15, 17].includes(abs)) s += `<circle cx="${cx}" cy="${mid}" r="2.6" fill="rgba(255,255,255,.14)"/>`;
    }
    // Strings (rows) — bass thicker
    for (let i = 0; i < NS; i++)
      s += `<line x1="${x0}" y1="${sy(i)}" x2="${x1}" y2="${sy(i)}" stroke="rgba(255,255,255,.2)" stroke-width="${0.7 + i * 0.22}"/>`;
    // Frets (columns) — nut thick + light
    for (let f = 0; f <= NF; f++) {
      const isNut = nut && f === 0;
      s += `<line x1="${fx(f)}" y1="${sy(0)}" x2="${fx(f)}" y2="${sy(5)}" stroke="${isNut ? 'rgba(245,240,230,.85)' : 'rgba(255,255,255,.14)'}" stroke-width="${isNut ? 3.5 : 1}" stroke-linecap="round"/>`;
    }
    // Fret-position number (left of the panel) when not at the nut
    if (!nut) s += `<text x="11" y="${mid + 3.5}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="DM Mono,monospace">${base + 1}</text>`;
    // Open / muted markers (left of the nut) + fretted dots with note names
    for (let i = 0; i < NS; i++) {
      const f = frets[5 - i], y = sy(i);
      if (f === -1) { s += `<text x="${x0 - 11}" y="${y + 3.2}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.4)">×</text>`; continue; }
      if (f === 0)  { s += `<circle cx="${x0 - 11}" cy="${y}" r="3.6" fill="none" stroke="var(--accent2)" stroke-width="1.5"/>`; continue; }
      const df = f - base; if (df < 1 || df > NF) continue;
      const cx = fx(df - 0.5), pc = (TUNE[5 - i] + f) % 12, isRoot = pc === rootPC;
      s += `<circle cx="${cx}" cy="${y}" r="6.6" fill="var(--accent)"${isRoot ? ' stroke="#fff" stroke-width="1.8"' : ''}/>`;
      s += `<text x="${cx}" y="${y + 2.6}" text-anchor="middle" font-size="7" font-weight="700" fill="#fff" font-family="DM Mono,monospace">${_noteName(pc)}</text>`;
    }
    s += '</svg>';
    return s;
  }

  // ── State ─────────────────────────────────────────
  let _view = 'chords', _chords = [], _sel = [], _activePos = -1;
  const isOpen = () => !!document.getElementById('guitarShapeStrip')?.classList.contains('gss-on');
  const clampi = (v, max) => Math.max(0, Math.min(v, max));
  const _voicingsFor = c => c ? (_view === 'triads' ? triadVoicings(c.root, c.qual) : chordVoicings(c.root, c.qual, c.variant)) : [];

  // De-duplicated chord list — each unique chord+variant once (order of first appearance).
  // From the progression if there is one; otherwise the single current chord.
  function _collectChords() {
    const h = Array.isArray(st.history) ? st.history : [];
    const list = [], seen = new Set();
    const push = (rootName, qual, name, variant) => {
      const r = ENH[rootName] || rootName;
      const v = variant || 'triad';
      const key = r + ':' + qual + ':' + v;   // variant-aware de-dup
      if (seen.has(key)) return; seen.add(key);
      list.push({ name, root: rootName, qual, rootPC: NI[r] ?? 0, variant: v });
    };
    if (h.length) {
      h.forEach(it => {
        const rootName = (typeof chordRootOf === 'function') ? chordRootOf(it) : String(it.chord || 'C').replace(/m$|°$/, '');
        const qual = it.quality === 'Min' ? 'min' : it.quality === 'Dim' ? 'dim' : 'maj';
        const variant = it.variant || 'triad';
        const name = (variant !== 'triad' && typeof chordDisplay === 'function') ? chordDisplay(it) : it.chord;
        push(rootName, qual, name, variant);
      });
    } else {
      let root, qual, variant = 'triad';
      if (typeof ChordVariants === 'object' && ChordVariants.ctx && ChordVariants.ctx.root) {
        root = ChordVariants.ctx.root;
        qual = /min/i.test(ChordVariants.ctx.quality) ? 'min' : /dim/i.test(ChordVariants.ctx.quality) ? 'dim' : 'maj';
        variant = ChordVariants.ctx.current || 'triad';
      } else {
        root = st.key; qual = (typeof modeIsMinor === 'function' && modeIsMinor(st.mode)) ? 'min' : 'maj';
      }
      push(root, qual, root + (qual === 'min' ? 'm' : qual === 'dim' ? '°' : ''), variant);
    }
    return list;
  }

  function _cardHTML(c, pos) {
    const vs = _voicingsFor(c);
    const sel = clampi(_sel[pos] || 0, Math.max(0, vs.length - 1));
    const multi = vs.length > 1;
    const ctl = multi
      ? `<div class="gsc-ctl">
           <button class="gsc-arrow" onclick="event.stopPropagation();GuitarShapes.step(${pos},-1)" aria-label="lower position">‹</button>
           <div class="gsc-dots">${vs.map((_, i) => `<span class="gsc-dot${i === sel ? ' on' : ''}" onclick="event.stopPropagation();GuitarShapes.setVoicing(${pos},${i})"></span>`).join('')}</div>
           <button class="gsc-arrow" onclick="event.stopPropagation();GuitarShapes.step(${pos},1)" aria-label="higher position">›</button>
         </div>`
      : `<div class="gsc-ctl gsc-ctl-solo"></div>`;
    const diag = vs.length ? drawMiniFret(vs[sel].frets, c.rootPC) : '<div class="gss-empty">—</div>';
    return `<div class="gss-card${pos === _activePos ? ' gss-active' : ''}" data-pos="${pos}" role="button">
        <div class="gsc-name">${c.name}</div>
        ${ctl}
        <div class="gsc-diag" onpointerdown="GuitarShapes.cardDown(event,${pos})">${diag}</div>
        <div class="gsc-pos">${vs.length ? vs[sel].label : ''}</div>
      </div>`;
  }

  function _render() {
    const el = document.getElementById('guitarShapeStrip'); if (!el) return;
    _chords = _collectChords();
    if (!_chords.length) { el.classList.remove('gss-on'); document.body.classList.remove('shapes-open'); return; }
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
    document.body.classList.add('shapes-open');
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

  // Strum the chord's current voicing with the nylon-guitar voice (low → high),
  // so tapping a shape lets you actually hear it in the guitar tone.
  const _STR_BASE = [-20, -15, -10, -5, -1, 4];   // low-E … high-e, 0 = middle C
  function _strum(pos) {
    const c = _chords[pos]; if (!c) return;
    if (typeof AudioEngine !== 'object' || !AudioEngine.playGuitarNote) return;
    const vs = _voicingsFor(c), sel = clampi(_sel[pos] || 0, Math.max(0, vs.length - 1));
    const frets = vs[sel] && vs[sel].frets; if (!frets) return;
    let d = 0;
    frets.forEach((f, s) => {
      if (f >= 0) { const p = _STR_BASE[s] + f; setTimeout(() => AudioEngine.playGuitarNote(p), d); d += 17; }
    });
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
    setVoicing(pos, i) { _sel[pos] = i; _updateCard(pos); _highlightCard(pos); _strum(pos); },
    // Arrows → step to the lower/higher position (clamped).
    step(pos, dir) {
      const vs = _voicingsFor(_chords[pos]); if (vs.length <= 1) return;
      _sel[pos] = Math.max(0, Math.min(vs.length - 1, (_sel[pos] || 0) + dir));
      _updateCard(pos); _highlightCard(pos); _strum(pos);
    },

    // Pointer on a card's fretboard: a sideways drag slides voicings (low→high);
    // a tap (no drag) lights that chord's current shape big on the real fretboard.
    cardDown(e, pos) {
      const startX = e.clientX;
      const move = ev => { if (Math.abs(ev.clientX - startX) > 6 && ev.cancelable) ev.preventDefault(); };
      const up = ev => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        const dx = ev.clientX - startX;
        if (Math.abs(dx) > 22) this.step(pos, dx < 0 ? 1 : -1);
        else { _highlightCard(pos); _strum(pos); }
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
    },

    // A builder bar was tapped → highlight the matching chord card (variant-aware).
    hint(root, qual, variant) {
      if (!isOpen() || !root) return;
      const r = ENH[root] || root, q = /min/i.test(qual) ? 'min' : /dim/i.test(qual) ? 'dim' : 'maj';
      const v = variant && variant !== 'triad' ? variant : null;
      _render();
      // Prefer exact variant match, fall back to same root+quality
      let idx = v ? _chords.findIndex(c => (ENH[c.root] || c.root) === r && c.qual === q && c.variant === v) : -1;
      if (idx < 0) idx = _chords.findIndex(c => (ENH[c.root] || c.root) === r && c.qual === q);
      if (idx >= 0) _highlightCard(idx);
    },

    // Progression changed → rebuild cards (keeps the active highlight if still valid).
    onProgressionChange() { if (isOpen()) { _render(); if (_activePos >= 0 && _activePos < _chords.length) _highlightCard(_activePos); } },
    // Language changed → relabel.
    refresh() { if (isOpen()) _render(); },

    close() {
      _activePos = -1;
      document.getElementById('guitarShapeStrip')?.classList.remove('gss-on');
      document.body.classList.remove('shapes-open');
      if (typeof highlightGuitarShape === 'function') highlightGuitarShape(null);
    },
  };
})();
