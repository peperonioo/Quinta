// ── SCALE PIANO (V6.46) ───────────────────────────────
// The scale drawn where a musician already reads it: on a keyboard, with the
// notes of the key lit and numbered. Chips tell you WHICH notes; only a keyboard
// tells you the SHAPE — where the gaps fall, which black keys you are allowed to
// touch. Same renderer everywhere it appears, so the app can never light one set
// of keys here and a different set there.
//
// What lights up is decided by ONE thing: the pitch classes of the scale it is
// handed. No second table, no per-surface heuristic.
const ScalePiano = (() => {
  // One octave, C to C. Drawing FROM the tonic would read more like a scale, but
  // it breaks on a flat tonic — E♭ is the black key BEFORE the E the drawing
  // would start on, so it would fall outside its own keyboard. The geography
  // stays C-based (the way every keyboard diagram is) and the ORDER is carried
  // by the degree number on each lit key.
  const WHITE = [0, 2, 4, 5, 7, 9, 11, 12];
  const BLACK = [{ semi: 1, at: 0 }, { semi: 3, at: 1 }, { semi: 6, at: 3 },
                 { semi: 8, at: 4 }, { semi: 10, at: 5 }];
  const pcOf = s => ((s % 12) + 12) % 12;

  // pitch class → { name, deg }. Built from the notes themselves, which is what
  // makes the highlight and the labels impossible to disagree. Accepts plain
  // names (a scale: degrees 1–7 follow from the order) or {name, deg} objects
  // (a chord, where a running count would be a lie).
  function map(notes) {
    const m = new Map();
    (notes || []).forEach((n, i) => {
      const name = (n && n.name != null) ? n.name : n;
      const deg  = (n && n.name != null) ? n.deg : i + 1;
      const pc = ni(name);
      if (!m.has(pc)) m.set(pc, { name, deg });
    });
    return m;
  }

  function html(scale, opts) {
    const o    = opts || {};
    const info = map(scale);
    const first = (scale && scale.length) ? scale[0] : null;
    const rootPc = first == null ? -1 : ni(first.name != null ? first.name : first);
    const es = (typeof st === 'object' && st.lang === 'es');
    const cell = (semi, kind, i) => {
      const pc  = pcOf(semi);
      const hit = info.get(pc);
      const nm  = hit ? hit.name : dn(na(pc));
      const cls = 'sp-' + kind + (hit ? ' on' : '') + (hit && pc === rootPc ? ' root' : '');
      const aria = nm + (hit && hit.deg != null ? ` · ${es ? 'grado' : 'degree'} ${hit.deg}` : '');
      return `<span class="${cls}" style="--i:${i}" role="button" tabindex="-1"
        data-act="scale.note" data-semi="${semi}" aria-label="${aria}"
        ><b>${nm}</b>${hit && hit.deg != null ? `<i>${hit.deg}</i>` : ''}</span>`;
    };
    return `<div class="sp${o.small ? ' sm' : ''}" role="group" aria-label="${
      es ? 'Escala en el piano' : 'Scale on the piano'}">${
      WHITE.map((s, i) => cell(s, 'w', i)).join('')}${
      BLACK.map(b => cell(b.semi, 'b', b.at)).join('')}</div>`;
  }

  function render(hostId, scale, opts) {
    const host = document.getElementById(hostId);
    if (!host) return;
    host.innerHTML = html(scale, opts);
  }

  // Tapping a key sounds it — the whole point of a keyboard you can see.
  function play(semi) {
    if (semi == null || isNaN(semi)) return;
    if (typeof AudioEngine === 'object') AudioEngine.playNote(semi, 0.9);
    if (typeof haptic === 'function') haptic('tap');
  }

  // The Explore surface: the key's own scale, under the wheel. Hidden until
  // asked for, because it is an aid, not the subject of the screen.
  function renderKey() {
    const block = document.getElementById('scalePianoBlock');
    if (!block) return;
    const open = st.scalePiano !== false;
    block.classList.toggle('is-open', open);
    const btn = document.getElementById('scalePianoBtn');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    const scale = gs();
    const label = document.getElementById('spbKey');
    if (label) {
      const mf = modeFriendly(wheelMode());
      label.textContent = scale[0] + ' ' + (mf ? mf[0] : '');
    }
    if (open) render('scalePiano', scale);
    else { const h = document.getElementById('scalePiano'); if (h) h.innerHTML = ''; }
  }

  function toggle() {
    st.scalePiano = st.scalePiano === false;
    saveState();
    tel('scale_piano', { on: st.scalePiano });
    renderKey();
    if (typeof Inspector === 'object') Inspector.render();
  }

  return { html, render, renderKey, toggle, play, map, WHITE, BLACK };
})();
