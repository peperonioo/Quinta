// ── TABS / MODES ─────────────────────────────────────

// ── MODES (V6.22) ─────────────────────────────────────
// Three modes in the order the work happens — explore → build → produce —
// replacing Theory/Production, which split by MODULE and left both halves fully
// visible at once. Which surfaces belong to which mode is declared in CSS via
// body[data-mode]; this only switches the flag and repairs what needs a live
// measurement afterwards.
// Three destinations, in the order the work happens: understand the key, write
// the progression, play it on the board. 'produce' was removed in B3 (the rhythm
// is a track of the document); 'instrument' arrives in V6.26 because retiring the
// dock in B1 left a guitarist with no place to go — the inspector's six-fret
// summary answers "this chord", not "the whole neck".
const MODES_UI = ['explore', 'build', 'instrument', 'styles'];

function switchTab(tab, btn) {
  // Legacy names (and the removed 'produce') all resolve to Build now.
  const mode = MODES_UI.includes(tab) ? tab : (tab === 'explore' ? 'explore' : 'build');
  tel('tab', { tab: mode });

  const el = btn || document.querySelector(`.tab-btn[data-tab="${mode}"]`);
  const tabsEl = el?.closest?.('.tabs');
  if (tabsEl) {
    const buttons = [...tabsEl.querySelectorAll('.tab-btn')];
    tabsEl.style.setProperty('--tab-x', `calc(${Math.max(0, buttons.indexOf(el))} * 100%)`);
  }
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === el));
  // The bottom bar is a second set of buttons for the same modes — match by mode,
  // not by identity, so whichever bar you tapped they both end up in sync.
  document.querySelectorAll('.tb-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === mode));

  document.getElementById('panel-theory').style.display = 'block';
  document.body.dataset.mode = mode;

  const ctx = document.getElementById('ctxBar');
  if (ctx) ctx.hidden = (mode === 'explore');
  // The builder measures its own width to size the grid; while it was hidden that
  // measurement was 0, so re-lay it now that it can actually be measured.
  if (mode === 'build' && (st.history || []).length) HistoryEngine.render();
  syncCtxBar();

  // Instrument mode: the dock IS the page. On a phone it normally lives inside
  // the transport island, so it has to come home before it can be the subject.
  if (mode === 'styles' && typeof StylesTab === 'object') StylesTab.render();
  if (mode === 'instrument') {
    if (typeof TransportSheet === 'object' && TransportSheet.isOpen()) TransportSheet.collapse();
    gotoInstrument(st.instr || 'piano');
    // The boards read their own width, which was 0 while the mode was hidden.
    requestAnimationFrame(() => { try { renderPiano(); renderGuitar(); } catch (_) {} });
    syncInstrBar();
  }

  if (typeof Doc === 'object') Doc.render();
  if (typeof Rhythm === 'object') Rhythm.render();
  // First visit to Build used to show a 26px empty <aside>: the inspector only
  // rendered on selection changes, never on plain arrival.
  if (mode === 'build' && typeof Inspector === 'object') Inspector.render();
  const shown = document.getElementById('panel-theory');
  if (shown) { shown.classList.remove('tab-enter'); void shown.offsetWidth; shown.classList.add('tab-enter'); }
}

// ── The bar minimises while you scroll down (V6.27) ───
// The floating capsule is small, but on a phone every row counts, so it stands
// down to icons-only when you are heading INTO content and comes back the
// moment you head out of it — the same contract as an iOS 26 tab bar. A 6px
// deadband stops a jittery finger from flipping it on every frame.
function initTabbarMinimise() {
  if (document.body._tbWired) return;
  document.body._tbWired = true;
  let last = scrollY, ticking = false;
  const apply = () => {
    ticking = false;
    const y = Math.max(0, scrollY), d = y - last;
    if (Math.abs(d) < 6) return;
    last = y;
    // Never minimised at the top, and never while a scrub is steering the bar —
    // resizing the thing under the finger mid-gesture moves its hit zones.
    if (document.body.classList.contains('tabbar-scrubbing')) return;
    document.body.classList.toggle('tabbar-min', d > 0 && y > 40);
  };
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(apply);
    // Backstop: a dropped rAF used to leave ticking=true FOREVER — the
    // minimise silently stopped responding until some other frame fired.
    // (apply resets ticking first thing, so the double call is idempotent.)
    setTimeout(apply, 90);
  }, { passive: true });
}

// ── Press-and-slide between tabs (V6.28) ─────────────
// The other half of an iOS 26 tab bar: hold a tab and the capsule turns into
// something you steer — slide the thumb across and the selection follows it,
// commit by lifting. A tap still just switches, so nothing is behind the
// gesture that was not already one touch away.
//
// The system's own version refracts the glass under your finger. That part is
// native and cannot be reproduced honestly in a page, so this does what it CAN
// do faithfully: the accent pill tracks the thumb and the tab under it lifts.
const HOLD_MS = 240;
const HOLD_SLOP = 10;   // px of finger drift that still counts as "holding still"

function initTabbarScrub() {
  const bar = document.getElementById('tabbar'); if (!bar || bar._scrub) return;
  bar._scrub = true;

  // iOS long-press wants to select text / show the callout — both fight the hold.
  bar.addEventListener('contextmenu', ev => ev.preventDefault());

  let timer = null, scrubbing = false, pid = null, target = null, suppress = false;
  let sx = 0, sy = 0;   // where the press started, for the slop check
  const btns  = () => [...bar.querySelectorAll('.tb-btn')];
  const under = x => btns().find(b => { const r = b.getBoundingClientRect(); return x >= r.left && x <= r.right; })
                  || (x < bar.getBoundingClientRect().left ? btns()[0] : btns()[btns().length - 1]);

  function paint(el) {
    target = el || null;
    btns().forEach(b => b.classList.toggle('is-scrub', b === target));
  }
  function stop() {
    clearTimeout(timer); timer = null;
    if (pid !== null) { try { bar.releasePointerCapture(pid); } catch (_) {} pid = null; }
    scrubbing = false;
    document.body.classList.remove('tabbar-scrubbing');
    paint(null);
  }

  bar.addEventListener('pointerdown', ev => {
    const b = ev.target.closest && ev.target.closest('.tb-btn'); if (!b) return;
    pid = ev.pointerId; sx = ev.clientX; sy = ev.clientY;
    timer = setTimeout(() => {
      scrubbing = true;
      document.body.classList.add('tabbar-scrubbing');
      // The bar is small; capture so the thumb can wander off it and still steer.
      try { bar.setPointerCapture(pid); } catch (_) {}
      paint(b);
      haptic('sel');
      tel('tabbar_scrub', {});
    }, HOLD_MS);
  });

  bar.addEventListener('pointermove', ev => {
    if (!scrubbing) {
      // Finger on the move before the hold armed = this is a swipe, not a hold.
      // Without this the timer fired mid-scroll and the scrub grabbed a gesture
      // the browser was already using — the "se vuelve loco" bug.
      if (timer && Math.hypot(ev.clientX - sx, ev.clientY - sy) > HOLD_SLOP) {
        clearTimeout(timer); timer = null;
      }
      return;
    }
    ev.preventDefault();
    const el = under(ev.clientX);
    if (el !== target) { paint(el); haptic('sel'); }
  });

  const release = () => {
    if (!scrubbing) { stop(); return; }
    const go = target;
    // A real gesture happened, so the click that follows it is not a second
    // intent — it would re-fire tab.go on whichever button was pressed FIRST.
    suppress = true; setTimeout(() => { suppress = false; }, 320);
    stop();
    if (go) switchTab(go.dataset.tab);          // no btn: switchTab finds the right one
  };
  bar.addEventListener('pointerup', release);
  bar.addEventListener('pointercancel', stop);
  bar.addEventListener('click', ev => {
    if (suppress) { ev.stopPropagation(); ev.preventDefault(); }
  }, true);                                      // capture: beat the delegated action
}

// The instrument mode's own header: the key (tap to go choose another) and the
// progression as chips, so a chord can be auditioned on the board without a trip
// back to Crear.
function syncInstrBar() {
  const k = document.getElementById('ibKey'); if (!k) return;
  k.textContent = displayKeyLabel();
  const m = document.getElementById('ibMode'); if (m) m.textContent = gm().name;
  if (typeof renderInstrProgStrip === 'function') renderInstrProgStrip();
}

// The one bit of Explore you still need while working: what key you are in.
function syncCtxBar() {
  const k = document.getElementById('ctxKey'); if (!k) return;
  k.textContent = displayKeyLabel();
  const m = document.getElementById('ctxMode'); if (m) m.textContent = gm().name;
  renderScaleChips('ctxScale');
}
