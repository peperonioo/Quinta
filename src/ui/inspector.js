// ── INSPECTOR (V2 · fase B1) ──────────────────────────
// One panel whose content follows the selection, replacing a screen where every
// surface was permanent and equal in rank.
//
//   nothing selected → the KEY      (wheel territory: scale, relative, degrees)
//   a chord selected → that CHORD   (role, variants, how to play it, what's next)
//
// It exists to kill two specific costs measured in V1:
//   · seeing a chord on the guitar took FOUR steps — scroll to the dock, switch
//     instrument, find the chord, open Shapes. Here it is one tap on the chord.
//   · the helps (chord shapes, triads, scale) were behind a button you had to
//     discover. Here they are three visible tabs, always.
const Inspector = (() => {
  let sel = -1;                       // index into st.history, or -1 for "the key"
  let instr = 'guitar';               // which instrument the inspector is showing
  let view  = 'chord';                // chord · triads · scale

  const el = () => document.getElementById('inspector');
  const es = () => st.lang === 'es';
  const L  = (en, e) => (es() ? e : en);

  const item = () => (Array.isArray(st.history) ? st.history[sel] : null);

  // ── selection ────────────────────────────────────────
  function select(i) {
    const h = Array.isArray(st.history) ? st.history : [];
    sel = (i != null && h[i]) ? i : -1;
    if (sel >= 0) {
      AudioEngine.playChord(chordPitchesForItem(h[sel]));
      tel('inspect_chord', { view, instr });
    }
    render();
    _markSelection();
  }
  function clear() { sel = -1; render(); _markSelection(); }
  function selected() { return sel; }

  function _markSelection() {
    document.querySelectorAll('.builder-step').forEach((b, i) =>
      b.classList.toggle('is-selected', i === sel));
    // With a chord selected the inspector already answers "what goes next", so
    // the bubble row stands down and the inspector fits without scrolling.
    document.body.classList.toggle('has-selection', sel >= 0);
  }

  function setInstrument(x) { instr = x; tel('inspect_instr', { instr: x }); render(); }
  function setView(v)       { view  = v; tel('inspect_view',  { view: v });  render(); }

  // ── the chord's role in the key, in one line ─────────
  function _role(it) {
    const d = DD[it.degreeIndex];
    if (!d) return L('Borrowed colour — outside the key', 'Color prestado — fuera de la tonalidad');
    const roles = {
      Tonic:        L('home — everything resolves here', 'casa — todo resuelve aquí'),
      Supertonic:   L('gentle tension, leads to V', 'tensión suave, lleva al V'),
      Mediant:      L('colour, bridges tonic and subdominant', 'color, puente entre tónica y subdominante'),
      Subdominant:  L('warm lift, opens the phrase', 'elevación cálida, abre la frase'),
      Dominant:     L('maximum pull toward home', 'máxima tracción hacia casa'),
      Submediant:   L('emotional depth, the relative minor', 'profundidad emocional, el relativo menor'),
      'Leading tone': L('unstable edge before resolving', 'filo inestable antes de resolver'),
    };
    return roles[d.role] || '';
  }

  // ── what goes well after this chord ──────────────────
  function _next(it) {
    if (it.degreeIndex < 0) return [];
    try { return SuggestionEngine.getNextWithScores(it.degreeIndex).slice(0, 4); }
    catch (_) { return []; }
  }

  // ── render ───────────────────────────────────────────
  function render() {
    const box = el(); if (!box) return;
    box.innerHTML = (sel >= 0 && item()) ? _chordHTML(item()) : _keyHTML();
    applyIcons(box);
    // Draw the instrument into the freshly-rendered containers.
    _paintInstrument();
  }

  function _keyHTML() {
    const chords = gc();
    return `
      <div class="insp-head">
        <div class="insp-title"><b>${displayKeyLabel()}</b><small>${gm().name}</small></div>
        <div class="insp-sub">${L('Tap a chord to inspect it', 'Toca un acorde para inspeccionarlo')}</div>
      </div>
      <div class="insp-sec">
        <div class="insp-lbl">${L('Chords in this key', 'Acordes de esta tonalidad')}</div>
        <div class="insp-degrees">
          ${chords.map((c, i) => `<button class="insp-deg" data-act="insp.add" data-idx="${i}">
            <span class="idg">${casedRoman(c.degree, c.quality)}</span><span class="idn">${c.chord}</span>
          </button>`).join('')}
        </div>
      </div>
      <div class="insp-sec">
        <div class="insp-lbl">${L('Scale', 'Escala')}</div>
        <div class="scale-orbs" id="inspScale"></div>
      </div>`;
  }

  function _chordHTML(it) {
    const vars = variantsFor(it.quality) || [];
    const cur  = it.variant || 'triad';
    const nx   = _next(it);
    const T = (v, lbl) => `<button class="${view === v ? 'on' : ''}" data-act="insp.view" data-id="${v}">${lbl}</button>`;
    const I = (x, lbl) => `<button class="${instr === x ? 'on' : ''}" data-act="insp.instr" data-id="${x}">${lbl}</button>`;
    return `
      <div class="insp-head">
        <button class="insp-back" data-act="insp.clear" aria-label="${L('Back to key', 'Volver a la tonalidad')}">‹</button>
        <div class="insp-title"><b>${chordLabel(it)}</b><small>${casedRoman(it.degree, it.quality)}</small></div>
        <div class="insp-sub">${_role(it)}</div>
      </div>

      <div class="insp-sec">
        <div class="insp-lbl">${L('Variations', 'Variaciones')}</div>
        <div class="insp-vars">
          ${vars.map(v => `<button class="insp-var${v.id === cur ? ' on' : ''}"
            data-act="insp.variant" data-id="${v.id}">${it.chord.replace(/m$/, '')}${v.suf}</button>`).join('')}
        </div>
      </div>

      <div class="insp-sec">
        <div class="insp-row">
          <div class="insp-seg">${I('piano', L('Piano', 'Piano'))}${I('guitar', L('Guitar', 'Guitarra'))}</div>
          <!-- The three helps are TABS, not a button you have to find. This is the
               "sin descubrir tanto" requirement: chord shape, triads and the scale
               are one tap apart, always visible. -->
          <div class="insp-seg views">
            ${T('chord',  L('Chord', 'Acorde'))}${T('triads', L('Triads', 'Tríadas'))}${T('scale',  L('Scale', 'Escala'))}
          </div>
        </div>
        <div class="insp-instr" id="inspInstr"></div>
      </div>

      ${nx.length ? `<div class="insp-sec">
        <div class="insp-lbl">${L('Goes well after', 'Va bien después')}</div>
        <div class="insp-next">
          ${nx.map(n => `<button class="insp-nextb" data-act="insp.add" data-idx="${n.to}">
            <span class="idn">${n.chord.chord}</span><span class="ipct">${n.fit}%</span>
          </button>`).join('')}
        </div></div>` : ''}`;
  }

  // ── the instrument, drawn for the current chord/view ──
  function _paintInstrument() {
    if (sel < 0) { renderScaleChips('inspScale'); return; }
    const host = document.getElementById('inspInstr'); if (!host) return;
    const it = item(); if (!it) return;
    // Which pitches to light up:
    //   scale  → every note of the key
    //   triads → root, third and fifth ONLY (extensions dropped, which is the
    //            whole point of the triad view — it was showing the same notes
    //            as the chord view until this was fixed)
    //   chord  → the chord as voiced, extensions included
    const pc = p => ((p % 12) + 12) % 12;
    let pitches;
    if (view === 'scale') pitches = gs().map(n => ni(n));
    else {
      const full = chordPitchesForItem(it).map(pc);
      const uniq = [...new Set(full)];
      pitches = (view === 'triads') ? uniq.slice(0, 3) : uniq;
    }
    host.innerHTML = instr === 'piano' ? _pianoHTML(pitches) : _fretHTML(pitches, it);
  }

  // Compact one-octave keyboard — enough to read a voicing, small enough to sit
  // inside the panel without its own scroll.
  function _pianoHTML(pcs) {
    const WHITE = [0, 2, 4, 5, 7, 9, 11], NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const BLACK = [{ pc: 1, at: 0 }, { pc: 3, at: 1 }, { pc: 6, at: 3 }, { pc: 8, at: 4 }, { pc: 10, at: 5 }];
    const on = pc => pcs.includes(pc) ? ' on' : '';
    return `<div class="ip-keys">
      ${WHITE.map((pc, i) => `<span class="ipw${on(pc)}"><i>${NAMES[i]}</i></span>`).join('')}
      ${BLACK.map(b => `<span class="ipb${on(b.pc)}" style="--at:${b.at}"></span>`).join('')}
    </div>`;
  }

  // Fretboard, first 5 frets — the position where most shapes live.
  function _fretHTML(pcs, it) {
    const STRINGS = [4, 11, 7, 2, 9, 4];        // E B G D A E (pitch classes)
    const FRETS = 6;
    const root = ((it.note != null ? it.note : ni(it.chord.replace(/m$|°$|dim$/, ''))) % 12 + 12) % 12;
    let html = '<div class="if-board">';
    STRINGS.forEach(open => {
      html += '<div class="if-str">';
      for (let f = 0; f <= FRETS; f++) {
        const pc = ((open + f) % 12 + 12) % 12;
        const hit = pcs.includes(pc);
        html += `<span class="if-c${hit ? (pc === root ? ' root' : ' on') : ''}">${hit ? dn(na(pc)) : ''}</span>`;
      }
      html += '</div>';
    });
    return html + '</div>';
  }

  // ── actions ──────────────────────────────────────────
  function pickVariant(id) {
    const it = item(); if (!it) return;
    it.variant = (id === 'triad') ? null : id;
    saveState();
    AudioEngine.playChord(chordPitchesForItem(it));
    HistoryEngine.render();
    render();
    _markSelection();
  }
  // Adding from the inspector: from the key view it's "add this degree"; from a
  // chord view it's "add what goes next".
  function addDegree(i) {
    HistoryEngine.addDegree(i);
    select((st.history || []).length - 1);
  }

  return { select, clear, selected, render, setInstrument, setView, pickVariant, addDegree };
})();
