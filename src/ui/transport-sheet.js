// ── TRANSPORT SHEET (V5.35 · transport-sheet branch) ──
// iOS-style detented bottom sheet. Peek = just the transport (Play · key · BPM);
// drag the handle (or tap the chevron) up to Half → Full to reveal instruments
// and harmony tools. One glass surface replaces the scattered floating islands.
const TransportSheet = (() => {
  const DETENTS = ['peek', 'half', 'full'];
  let state = 'peek';
  const el = () => document.getElementById('transportSheet');
  const H  = () => window.innerHeight || 800;

  // translateY (px) for a detent: the sheet is full-height and slid down to reveal
  // only the wanted slice. 0 = fully open; larger = more hidden below the screen.
  function tyFor(s) {
    const sheetH = H() * 0.84;
    if (s === 'full') return 0;
    if (s === 'half') return Math.max(0, sheetH - H() * 0.46);
    return Math.max(0, sheetH - 72);   // peek — handle + transport only
  }

  function apply(s, animate = true) {
    const e = el(); if (!e) return;
    state = s;
    e.dataset.state = s;
    e.style.transition = animate ? 'transform .36s cubic-bezier(.32,.72,0,1)' : 'none';
    e.style.transform  = `translateY(${tyFor(s)}px)`;
    document.body.classList.toggle('ts-open', s !== 'peek');
    if (typeof OverlayManager === 'object' && s !== 'peek') OverlayManager.opened('transport-sheet');
  }

  function set(s)      { apply(DETENTS.includes(s) ? s : 'peek'); }
  function toggle()    { set(state === 'peek' ? 'half' : 'peek'); }
  function collapse()  { apply('peek'); }
  function isOpen()    { return state !== 'peek'; }

  // Pointer drag on the grip/header → follow the finger, snap to nearest detent.
  function initDrag() {
    const e = el(); if (!e) return;
    const grip = e.querySelector('.ts-grip-zone'); if (!grip) return;
    let startY = 0, startTy = 0, dragging = false, moved = false;
    grip.addEventListener('pointerdown', ev => {
      if (ev.target.closest('button')) return;          // let buttons do their thing
      dragging = true; moved = false; startY = ev.clientY; startTy = tyFor(state);
      e.style.transition = 'none';
      try { grip.setPointerCapture(ev.pointerId); } catch (_) {}
    });
    grip.addEventListener('pointermove', ev => {
      if (!dragging) return;
      const ty = Math.max(0, startTy + (ev.clientY - startY));
      if (Math.abs(ev.clientY - startY) > 3) moved = true;
      e.style.transform = `translateY(${ty}px)`;
    });
    const end = ev => {
      if (!dragging) return; dragging = false;
      if (!moved) { toggle(); return; }                 // a tap (no drag) toggles
      const ty = Math.max(0, startTy + (ev.clientY - startY));
      const nearest = DETENTS.reduce((a, b) => Math.abs(tyFor(b) - ty) < Math.abs(tyFor(a) - ty) ? b : a);
      apply(nearest);
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }

  // Mirror the live key / mode / tempo into the peek header.
  function sync() {
    const e = el(); if (!e) return;
    const k = (typeof gr === 'function' && gr()[0]) ? gr()[0] : (st.key || 'C');
    const minor = (typeof modeIsMinor === 'function') ? modeIsMinor(st.mode) : (st.wheelView === 'minor');
    const kEl = document.getElementById('tsKey');  if (kEl) kEl.textContent = k;
    const mEl = document.getElementById('tsMode'); if (mEl) mEl.textContent = minor ? 'minor' : 'major';
    const bEl = document.getElementById('tsBpm');  if (bEl) bEl.textContent = st.bpm || 120;
  }

  function init() {
    if (!el()) return;
    apply('peek', false);
    initDrag();
    sync();
    window.addEventListener('resize', () => apply(state, false));
  }

  return { init, set, toggle, collapse, sync, isOpen, get state() { return state; } };
})();
