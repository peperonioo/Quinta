// ── TRANSPORT ISLAND (V5.35 · transport-sheet branch) ──
// A liquid-glass floating island. Collapsed = a small centred capsule (Play ·
// key · BPM). Tap → it morphs into a floating island holding the instrument
// pager and the harmony tools. Replaces the scattered floating bottom controls.
const TransportSheet = (() => {
  let state = 'peek';
  const el = () => document.getElementById('transportSheet');
  const mobile = () => matchMedia('(max-width:860px)').matches;
  const pager = () => document.querySelector('.instr-pager');

  // Move the instrument drawers into the island on phones; restore on desktop
  // (the renderers target #piano / #guitar by id, so relocation is safe).
  function placeInstruments() {
    const drawers = document.querySelector('.drawers'); if (!drawers) return;
    const host = document.getElementById('tsInstruments');
    // In Instrument mode the dock is the page, at every width — the island would
    // bury the very thing you switched to.
    const asPage = document.body.dataset.mode === 'instrument';
    if (asPage && drawers._home && drawers.parentElement === host) {
      drawers._home.insertBefore(drawers, drawers._homeNext);
      return;
    }
    if (asPage) return;
    if (mobile() && host && drawers.parentElement !== host) {
      if (!drawers._home) { drawers._home = drawers.parentElement; drawers._homeNext = drawers.nextSibling; }
      drawers.querySelectorAll('.drawer').forEach(d => d.open = true);   // both boards visible in the pager
      host.appendChild(drawers);
      wirePager();
    } else if (!mobile() && drawers._home && drawers.parentElement === host) {
      drawers._home.insertBefore(drawers, drawers._homeNext);
    }
  }

  // Keep the piano/guitar tabs in sync if the pager is swiped.
  function wirePager() {
    _wireInstrPager();
  }

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
    placeInstruments();
    sync();
    window.addEventListener('resize', placeInstruments);
  }

  return { init, open, collapse, toggle, sync, isOpen, placeInstruments, get state() { return state; } };
})();
