// ── GUITAR SHAPES ─────────────────────────────────────
// Box-notation chord diagrams for the guitar fretboard, shown in a scroll strip
// below the fretboard. Two views: full chord voicings (open / barre / high) and
// compact triads on the top-3 strings (root / 1st / 2nd inversion).
const GuitarShapes = (() => {
  const ENH = {Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
  const NI  = {C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
  // Open-string pitch classes, low→high: E A D G B e
  const TUNE = [4, 9, 2, 7, 11, 4];

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
    if (SPEC[`${r}:${qual}`]) add(SPEC[`${r}:${qual}`], 'Abierto');
    const ef = EF(r), af = AF(r);
    const sE = qual === 'min' ? em : eM, sA = qual === 'min' ? am : aM;
    add(sE(ef === 0 ? 12 : ef), 'Cejilla Mi');
    add(sA(af === 0 ? 12 : af), 'Cejilla La');
    if (af + 12 <= 14) add(sA(af + 12), 'Aguda');
    else if (ef + 12 <= 14) add(sE(ef + 12), 'Aguda');
    return out.slice(0, 4);
  }

  // ── Triads on the top-3 strings (G, B, e) ─────────
  function triadVoicings(root, qual) {
    const r = ENH[root] || root, rootPC = NI[r];
    const iv = qual === 'min' ? [0, 3, 7] : [0, 4, 7];
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
        const lbl = lowPC === rootPC ? 'Fund.'
                  : lowPC === (rootPC + iv[1]) % 12 ? '1ª inv' : '2ª inv';
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

  // ── State ─────────────────────────────────────────
  let _root = null, _qual = 'maj', _view = 'chords', _idx = 0, _shapes = [];

  function _build() {
    _shapes = _view === 'triads' ? triadVoicings(_root, _qual) : chordVoicings(_root, _qual);
    _idx = 0;
  }

  function _render() {
    const el = document.getElementById('guitarShapeStrip'); if (!el) return;
    if (!_root) { el.classList.remove('gss-on'); return; }
    const name = _root + (_qual === 'min' ? 'm' : '');
    const rootPC = NI[ENH[_root] || _root];
    el.innerHTML = `
      <div class="gss-head">
        <span class="gss-title">${name}</span>
        <div class="gss-seg" role="tablist">
          <button class="${_view==='chords'?'on':''}" role="tab" onclick="GuitarShapes.view('chords')">Acordes</button>
          <button class="${_view==='triads'?'on':''}" role="tab" onclick="GuitarShapes.view('triads')">Tríadas</button>
        </div>
        <button class="gss-x" onclick="GuitarShapes.close()" aria-label="Cerrar">×</button>
      </div>
      <div class="gss-scroll">
        ${_shapes.length ? _shapes.map((sh, i) => `
          <div class="gss-card${i===_idx?' gss-active':''}" role="button"
               onclick="GuitarShapes.pick(${i})" aria-label="${name} ${sh.label}">
            ${drawSVG(sh.frets, rootPC)}
            <div class="gss-cap">${sh.label}</div>
          </div>`).join('')
        : '<div class="gss-empty">—</div>'}
      </div>`;
    el.classList.add('gss-on');
  }

  function _highlight() {
    if (typeof highlightGuitarShape !== 'function') return;
    highlightGuitarShape(_shapes[_idx] ? _shapes[_idx].frets : null);
  }

  return {
    toggle() {
      const el = document.getElementById('guitarShapeStrip');
      if (el && el.classList.contains('gss-on')) { this.close(); return; }
      let root = null, qual = 'maj';
      if (typeof ChordVariants === 'object' && ChordVariants.ctx && ChordVariants.ctx.root) {
        root = ChordVariants.ctx.root;
        qual = ChordVariants.ctx.quality === 'min' ? 'min' : 'maj';
      } else {
        root = st.key;
        qual = (typeof modeIsMinor === 'function' && modeIsMinor(st.mode)) ? 'min' : 'maj';
      }
      _root = root; _qual = qual; _view = 'chords';
      _build(); _render(); _highlight();
      if (typeof OverlayManager === 'object') OverlayManager.opened('guitar-shapes');
    },

    // Switch between chord voicings and triads.
    view(v) {
      if (v === _view) return;
      _view = v; _build(); _render(); _highlight();
    },

    // Auto-update the strip when a builder bar's chord changes (only if visible).
    hint(root, qual) {
      if (!document.getElementById('guitarShapeStrip')?.classList.contains('gss-on')) return;
      if (!root) return;
      _root = root; _qual = qual === 'min' ? 'min' : 'maj';
      _build(); _render(); _highlight();
    },

    pick(idx) {
      _idx = idx;
      document.querySelectorAll('.gss-card').forEach((c, i) => c.classList.toggle('gss-active', i === idx));
      _highlight();
    },

    close() {
      _root = null; _shapes = [];
      document.getElementById('guitarShapeStrip')?.classList.remove('gss-on');
      if (typeof highlightGuitarShape === 'function') highlightGuitarShape(null);
    },
  };
})();
