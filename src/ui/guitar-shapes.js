// ── GUITAR SHAPES ─────────────────────────────────────
// Box-notation chord diagrams for the guitar fretboard.
// Shown in a scroll strip below the fretboard when the "Shapes" button is tapped.
const GuitarShapes = (() => {
  const ENH = {Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
  const NI  = {C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};

  // Barre shape generators. Array = [e6, a5, d4, g3, b2, e1] fret positions.
  const eM = f => [f,  f+2, f+2, f+1, f,   f  ]; // E-shape major
  const aM = f => [-1, f,   f+2, f+2, f+2, f  ]; // A-shape major
  const em = f => [f,  f+2, f+2, f,   f,   f  ]; // E-shape minor
  const am = f => [-1, f,   f+2, f+2, f+1, f  ]; // A-shape minor

  // Root fret on the E-string (E open = 0, F = 1, G = 3, A = 5, B = 7, C = 8, D = 10)
  const EF = r => (NI[r] - 4 + 12) % 12;
  // Root fret on the A-string (A open = 0, B = 2, C = 3, D = 5, E = 7, F = 8, G = 10)
  const AF = r => (NI[r] - 9 + 12) % 12;

  // Open / idiomatic overrides that differ from the pure barre formula
  const SPEC = {
    'C:maj':  [[-1,3,2,0,1,0], aM(3), eM(8)],
    'D:maj':  [[-1,-1,0,2,3,2], aM(5), eM(10)],
    'G:maj':  [[3,2,0,0,0,3],   eM(3), aM(10)],
    'D:min':  [[-1,-1,0,2,3,1], am(5), em(10)],
  };

  function voicings(root, qual) {
    const r = ENH[root] || root;
    const key = `${r}:${qual}`;
    if (SPEC[key]) return SPEC[key];
    const ef = EF(r), af = AF(r);
    const sE = qual === 'min' ? em : eM;
    const sA = qual === 'min' ? am : aM;
    const shapes = af <= ef ? [sA(af), sE(ef)] : [sE(ef), sA(af)];
    // Add a higher-position third voicing where it fits on a 17-fret neck
    const thirdA = af + 12, thirdE = ef + 12;
    if (thirdA <= 14) shapes.push(sA(thirdA));
    else if (thirdE <= 14) shapes.push(sE(thirdE));
    return shapes;
  }

  // ── SVG box diagram ───────────────────────────────
  function drawSVG(shape, label) {
    const W = 58, H = 78;
    const X0 = 7, X1 = 50, Y0 = 22, Y1 = 68;
    const FRETS = 4, NS = 6;
    const sx = i => X0 + (X1 - X0) * i / (NS - 1);
    const fy = f => Y0 + (Y1 - Y0) * f / FRETS;

    const active = shape.filter(f => f > 0);
    const minF = active.length ? Math.min(...active) : 0;
    const base = minF <= 1 ? 0 : minF - 1;
    const showNut = base === 0;

    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    s += `<text x="${W/2}" y="9" text-anchor="middle" font-size="7.5" fill="var(--muted)" font-family="DM Mono,monospace">${label}</text>`;
    if (!showNut)
      s += `<text x="${X1+5}" y="${fy(1)+3}" font-size="6.5" fill="var(--muted)" font-family="DM Mono,monospace">${minF}fr</text>`;
    // Nut / top line
    if (showNut)
      s += `<line x1="${sx(0)}" y1="${fy(0)}" x2="${sx(NS-1)}" y2="${fy(0)}" stroke="var(--fg)" stroke-width="2.2" stroke-linecap="round"/>`;
    else
      s += `<line x1="${sx(0)}" y1="${fy(0)}" x2="${sx(NS-1)}" y2="${fy(0)}" stroke="rgba(255,255,255,.2)" stroke-width="0.6"/>`;
    // Fret lines
    for (let f = 1; f <= FRETS; f++)
      s += `<line x1="${sx(0)}" y1="${fy(f)}" x2="${sx(NS-1)}" y2="${fy(f)}" stroke="rgba(255,255,255,.12)" stroke-width="0.5"/>`;
    // String lines (thicker for bass strings)
    for (let i = 0; i < NS; i++)
      s += `<line x1="${sx(i)}" y1="${fy(0)}" x2="${sx(i)}" y2="${fy(FRETS)}" stroke="rgba(255,255,255,.22)" stroke-width="${0.5 + (NS-1-i) * 0.16}"/>`;
    // Open / muted indicators above nut
    shape.forEach((f, i) => {
      const x = sx(i);
      if (f === -1)
        s += `<text x="${x}" y="${fy(0)-3}" text-anchor="middle" font-size="8" fill="rgba(255,255,255,.35)">×</text>`;
      else if (f === 0)
        s += `<circle cx="${x}" cy="${fy(0)-7}" r="2.8" fill="none" stroke="var(--accent)" stroke-width="1.2"/>`;
    });
    // Fingering dots
    shape.forEach((f, i) => {
      if (f <= 0) return;
      const df = f - base;
      if (df < 1 || df > FRETS) return;
      s += `<circle cx="${sx(i)}" cy="${fy(df - 0.5)}" r="4.2" fill="var(--accent)" opacity="0.9"/>`;
    });
    s += '</svg>';
    return s;
  }

  // ── State ─────────────────────────────────────────
  let _root = null, _qual = null, _idx = 0;

  function _voiceLabel(shape, i) {
    const frets = shape.filter(f => f > 0);
    const minF = frets.length ? Math.min(...frets) : 0;
    if (minF <= 1 || shape.some(f => f === 0)) return i === 0 ? 'Open' : 'Alt';
    return `${minF}ª pos`;
  }

  function _render() {
    const el = document.getElementById('guitarShapeStrip'); if (!el) return;
    if (!_root) { el.classList.remove('gss-on'); return; }
    const vs = voicings(_root, _qual);
    const name = _root + (_qual === 'min' ? 'm' : '');
    el.innerHTML = `
      <div class="gss-head">
        <span class="gss-title">${name} — voicings</span>
        <button class="gss-x" onclick="GuitarShapes.close()" aria-label="Close shapes">×</button>
      </div>
      <div class="gss-scroll">
        ${vs.map((sh, i) => `
          <div class="gss-card${i === _idx ? ' gss-active' : ''}"
               onclick="GuitarShapes.pick(${i})"
               role="button" aria-label="Voicing ${i+1}">
            ${drawSVG(sh, _voiceLabel(sh, i))}
          </div>`).join('')}
      </div>`;
    el.classList.add('gss-on');
  }

  return {
    // Toggle the strip from the "Shapes" button in the guitar drawer
    toggle() {
      const el = document.getElementById('guitarShapeStrip');
      if (el && el.classList.contains('gss-on')) { this.close(); return; }
      // Determine current chord: prefer ChordVariants context, then key tonic
      let root = null, qual = 'maj';
      if (typeof ChordVariants === 'object' && ChordVariants.ctx && ChordVariants.ctx.root) {
        root = ChordVariants.ctx.root;
        qual = ChordVariants.ctx.quality === 'min' ? 'min' : 'maj';
      } else {
        root = st.key;
        qual = (typeof modeIsMinor === 'function' && modeIsMinor(st.mode)) ? 'min' : 'maj';
      }
      _root = root; _qual = qual; _idx = 0;
      _render();
      if (typeof OverlayManager === 'object') OverlayManager.opened('guitar-shapes');
    },

    // Called by ChordVariants when a bar is opened — updates the strip if visible
    hint(root, qual) {
      if (!document.getElementById('guitarShapeStrip')?.classList.contains('gss-on')) return;
      if (!root) return;
      _root = root; _qual = qual === 'min' ? 'min' : 'maj'; _idx = 0;
      _render();
    },

    // Select a specific voicing card
    pick(idx) {
      _idx = idx;
      const vs = voicings(_root, _qual);
      if (typeof highlightGuitarShape === 'function') highlightGuitarShape(vs[idx]);
      document.querySelectorAll('.gss-card').forEach((c, i) =>
        c.classList.toggle('gss-active', i === idx));
    },

    close() {
      _root = null;
      document.getElementById('guitarShapeStrip')?.classList.remove('gss-on');
      if (typeof highlightGuitarShape === 'function') highlightGuitarShape(null);
    },
  };
})();
