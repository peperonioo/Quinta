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
  // Instrument and view PERSIST. Picking "guitar · scale" and finding piano ·
  // chord again on the next chord — or the next session — is a tax on the same
  // decision, every time. They are preferences, so they live in state.
  const instr = () => st.inspInstr || 'guitar';
  const view  = () => st.inspView  || 'chord';

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
      tel('inspect_chord', { view: view(), instr: instr() });
    }
    render();
    _markSelection();
  }
  function clear() { sel = -1; render(); _markSelection();
                     document.body.style.removeProperty('--insp-h'); }
  function selected() { return sel; }

  function _markSelection() {
    document.querySelectorAll('.builder-step').forEach((b, i) =>
      b.classList.toggle('is-selected', i === sel));
    // With a chord selected the inspector already answers "what goes next", so
    // the bubble row stands down and the inspector fits without scrolling.
    document.body.classList.toggle('has-selection', sel >= 0);
    if (sel >= 0) _keepClipVisible();
  }

  // On a phone the inspector is a fixed bottom sheet that can cover up to 76svh
  // — enough to sit on top of the clip you just tapped. Editing a chord you
  // cannot see is the same mistake the sheet was introduced to fix, and it also
  // put the clip's × out of reach. Scroll the lane clear of the sheet.
  function _keepClipVisible() {
    if (!matchMedia('(max-width:860px)').matches) return;
    requestAnimationFrame(() => {
      const clip  = document.querySelector('.builder-step.is-selected');
      const sheet = document.getElementById('inspector');
      if (!clip || !sheet) return;
      // The sheet is out of flow, so the page is often too short to scroll at
      // all — reserve its height at the bottom first.
      document.body.style.setProperty('--insp-h', sheet.getBoundingClientRect().height + 'px');
      // Then park the clip near the top of the screen. Aiming for a fixed
      // position beats measuring the gap to the sheet: the sheet is still
      // animating in when this runs, so its height is not final yet.
      requestAnimationFrame(() => clip.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    });
  }

  function setInstrument(x) { st.inspInstr = x; saveState(); tel('inspect_instr', { instr: x }); render(); }
  function setView(v)       { st.inspView  = v; saveState(); tel('inspect_view',  { view: v });  render(); }

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
    const T = (v, lbl) => `<button class="${view() === v ? 'on' : ''}" data-act="insp.view" data-id="${v}">${lbl}</button>`;
    const I = (x, lbl) => `<button class="${instr() === x ? 'on' : ''}" data-act="insp.instr" data-id="${x}">${lbl}</button>`;
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
        <div class="insp-voices">${_voicesHTML()}</div>
      </div>

      ${nx.length ? `<div class="insp-sec">
        <div class="insp-lbl">${L('Goes well after', 'Va bien después')}</div>
        <div class="insp-next">
          ${nx.map(n => `<button class="insp-nextb" data-act="insp.add" data-idx="${n.to}">
            <span class="idn">${n.chord.chord}</span><span class="ipct">${n.fit}%</span>
          </button>`).join('')}
        </div></div>` : ''}`;
  }

  // The voice (timbre) belongs to the instrument you are looking at: keyboard
  // voices under Piano, guitar voices under Guitar. They used to live ONLY inside
  // the instrument dock, which is why the dock could not be retired — hiding it
  // made five voices unreachable. Now they travel with the instrument.
  const VOICES = {
    piano:  [['piano', 'Piano'], ['epiano', 'E-Piano'], ['brass', 'Brass']],
    guitar: [['steel', { en: 'Acoustic', es: 'Acústica' }], ['electric', { en: 'Electric', es: 'Eléctrica' }]],
  };
  function _voicesHTML() {
    const list = VOICES[instr()] || [];
    const cur = st.pianoSound || 'piano';
    return list.map(([id, lbl]) => {
      const name = (typeof lbl === 'object') ? L(lbl.en, lbl.es) : lbl;
      const pid = (typeof voicePackId === 'function') ? voicePackId(id) : null;
      const locked = pid && !packOwned(pid);
      return `<button class="insp-voice${id === cur ? ' on' : ''}${locked ? ' locked' : ''}"
        data-act="insp.voice" data-id="${id}">${name}${locked ? '<i>P1</i>' : ''}</button>`;
    }).join('');
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
    const v = view();
    if (v === 'scale') pitches = gs().map(n => ni(n));
    else {
      const full = chordPitchesForItem(it).map(pc);
      const uniq = [...new Set(full)];
      pitches = (v === 'triads') ? uniq.slice(0, 3) : uniq;
    }
    host.innerHTML = instr() === 'piano' ? _pianoHTML(pitches) : _fretHTML(pitches, it);
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

  // A real fretboard: nut, fret wires, six strings and dots. The first version
  // drew a bare CSS grid of labels — technically the right notes, but it did not
  // read as a fretboard at all, and in the light theme the empty cells vanished.
  const FRETS = 6;
  const STRINGS = [                       // high to low, as you look at the neck
    { pc: 4,  name: 'E' }, { pc: 11, name: 'B' }, { pc: 7, name: 'G' },
    { pc: 2,  name: 'D' }, { pc: 9,  name: 'A' }, { pc: 4, name: 'E' },
  ];
  const MARKERS = [3, 5];                 // position dots, as on a real neck

  function _fretHTML(pcs, it) {
    const root = ((it.note != null ? it.note : ni(String(it.chord).replace(/m$|°$|dim$/, ''))) % 12 + 12) % 12;
    const rows = STRINGS.map(str => {
      const dots = [];
      for (let f = 0; f <= FRETS; f++) {
        const pc = ((str.pc + f) % 12 + 12) % 12;
        if (!pcs.includes(pc)) continue;
        dots.push(`<span class="if-dot${pc === root ? ' root' : ''}${f === 0 ? ' open' : ''}" style="--f:${f}">${dn(na(pc))}</span>`);
      }
      return `<div class="if-string"><span class="if-open">${str.name}</span>
        <span class="if-wire"></span>${dots.join('')}</div>`;
    }).join('');
    const nums = Array.from({ length: FRETS + 1 }, (_, f) =>
      `<span class="if-num${MARKERS.includes(f) ? ' mk' : ''}" style="--f:${f}">${f || ''}</span>`).join('');
    return `<div class="if-neck" style="--frets:${FRETS}">
      <div class="if-nut"></div>${rows}<div class="if-nums">${nums}</div></div>`;
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

  function pickVoice(id) {
    setVoice(id, null);
    const it = item(); if (it) AudioEngine.playChord(chordPitchesForItem(it));
    tel('inspect_voice', { voice: id });
    render();
  }

  return { select, clear, selected, render, setInstrument, setView, pickVariant, addDegree, pickVoice };
})();
