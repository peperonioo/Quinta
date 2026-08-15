// ── TRANSPORT ISLAND (V5.35 · transport-sheet branch) ──
// A liquid-glass floating island. Collapsed = a small centred capsule (Play ·
// key · BPM). Tap → it morphs into a floating island holding the instrument
// pager and the harmony tools. Replaces the scattered floating bottom controls.
const TransportSheet = (() => {
  let state = 'peek';
  const el = () => document.getElementById('transportSheet');
  const mobile = () => matchMedia('(max-width:860px)').matches;
  const pager = () => document.querySelector('.instr-pager');

  // V6.34 — the island stopped hosting the instruments. Since Instrument
  // became a mode, the pager here was the same boards in a third home with its
  // own DOM-relocation choreography — the source of two shipped bugs (the dock
  // buried under the island; zoom force-opening it). The island is TRANSPORT:
  // play, key, BPM, tools. The boards live in their tab.
  function apply(s) {
    const e = el(); if (!e) return;
    state = s; e.dataset.state = s;
    document.body.classList.toggle('ts-open', s === 'open');
    if (typeof OverlayManager === 'object' && s === 'open') OverlayManager.opened('transport-sheet');
  }
  function open()     { apply('open'); }
  function collapse() { apply('peek'); }
  function toggle()   { state === 'open' ? collapse() : open(); }
  function isOpen()   { return state === 'open'; }

  // Mirror the live key / mode / tempo into the capsule.
  function sync() {
    if (!el()) return;
    const k = (typeof gr === 'function' && gr()[0]) ? gr()[0] : (st.key || 'C');
    const minor = (typeof modeIsMinor === 'function') ? modeIsMinor(st.mode) : (st.wheelView === 'minor');
    const set = (cls, v) => el().querySelectorAll(cls).forEach(n => n.textContent = v);
    // Was hardcoded English, so the capsule read "C major" on every Spanish screen.
    set('.ts-k', k); set('.ts-m', t(minor ? 'common.minor' : 'common.major')); set('.ts-b', st.bpm || 120);
  }

  function init() {
    if (!el()) return;
    apply('peek');
    sync();
  }

  return { init, open, collapse, toggle, sync, isOpen, get state() { return state; } };
})();
