// ── WHEEL INTERACTION ─────────────────────────────────
// Drag-roulette, snap-to-key, click handling.

let spinAnim = null;
let wheelDrag = null;
let suppressWheelClick = false;
let _lastTopIdx = -1, _lastTickT = 0;
let wheelLocked = false;            // when true, tapping sectors auditions only — the key stays put

// Subtle tactile feedback. Accepts a raw ms, or a semantic weight:
//   'tap' (4) light · 'sel' (8) select/toggle · 'ok' (12) confirm/add/play.
function haptic(v) {
  const ms = typeof v === 'string' ? (v === 'ok' ? 12 : v === 'sel' ? 8 : 4) : v;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
}

// ── Chord lock (V5.12) ─────────────────────────────────
// Tap the wheel centre (the tonic) to lock the current key. While locked, tapping
// any sector only plays its chord (audition) with a quick flash — the key, scale,
// degrees and suggestions stay frozen, so you can explore sounds without losing
// your place. Spinning the wheel is a deliberate move and releases the lock.
function setWheelLock(on) {
  if (wheelLocked === on) return;
  wheelLocked = on;
  haptic(on ? 14 : 8);
  if (typeof renderWheel === 'function') renderWheel();   // re-light the diatonic chords
  updateWheelLockUI();
}
function toggleWheelLock() { setWheelLock(!wheelLocked); }

function updateWheelLockUI() {
  const wrap = document.querySelector('.circle-wrap');
  if (wrap) wrap.classList.toggle('wheel-locked', wheelLocked);
  const ring  = document.getElementById('wheelLockRing');
  const badge = document.getElementById('wheelLockBadge');
  if (ring)  ring.setAttribute('opacity', wheelLocked ? '0.9' : '0');
  if (badge) badge.setAttribute('opacity', wheelLocked ? '1' : '0');
  const hint = document.getElementById('wheelLockHint');
  if (hint) {
    hint.hidden = !wheelLocked;
    hint.textContent = (st.lang === 'es')
      ? 'Tonalidad fija · escucha acordes sin cambiar · toca el centro para soltar'
      : 'Key locked · audition chords freely · tap the centre to release';
  }
}

// Brief highlight pulse on a sector tapped while locked — shows "you're hearing
// this, not selecting it".
function auditionFlash(el) {
  if (!el) return;
  el.classList.remove('sector-audition');
  void el.getBoundingClientRect();
  el.classList.add('sector-audition');
  setTimeout(() => el.classList.remove('sector-audition'), 440);
}

// Wire the centre of the wheel to toggle the lock. Idempotent — safe to call once.
function initWheelLock() {
  ['centerGloss', 'cKey', 'cRel', 'centerDisc'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || el._lockWired) return;
    el._lockWired = true;
    el.addEventListener('click', e => {
      if (suppressWheelClick) return;
      e.stopPropagation();
      toggleWheelLock();
    });
  });
}

function wheelPointerAngle(e) {
  const svg   = document.getElementById('wheelSvg');
  const rect  = svg.getBoundingClientRect();
  const cx    = rect.left + rect.width / 2;
  const cy    = rect.top  + rect.height / 2;
  const dx    = (e.clientX ?? e.touches?.[0]?.clientX) - cx;
  const dy    = (e.clientY ?? e.touches?.[0]?.clientY) - cy;
  return Math.atan2(dy, dx) * 180 / Math.PI + 90;
}

function applyWheelRotation(rot) {
  wRot = rot;
  const grp = document.getElementById('wg');
  if (grp) grp.setAttribute('transform', `rotate(${rot},300,300)`);
  syncWheelLabels(rot);
  // Ratchet feel: a soft tick + haptic each time a new key passes the top,
  // only while the user is driving the wheel (drag or momentum).
  if (wheelDrag || spinAnim) {
    const idx = nearestFifthIndex(rot);
    if (idx !== _lastTopIdx) {
      _lastTopIdx = idx;
      haptic(4);
      const now = performance.now();
      if (typeof AudioEngine === 'object' && now - _lastTickT > 32) {
        AudioEngine.tick(1150, 0.05); _lastTickT = now;
      }
    }
  }
}

function updatePanelsAfterSpin() {
  const idx   = nearestFifthIndex(wRot);
  const key   = FIFTHS[idx];          // the major key of the sector now at top
  if (key !== wheelKey()) AppActions.setKey(key);
  else { renderTheory(); renderSuggestions(); }
}

function settleWheelFrom(rot, velocity) {
  // DECEL near 1 = the wheel keeps gliding for a while; SNAP_SPEED low so
  // residual motion carries before snapping to the nearest key. A small gain
  // on the release velocity makes a flick "throw" the wheel further.
  const DECEL = 0.984, SNAP_SPEED = 0.22, MAX_V = 54, GAIN = 1.3;
  // A pleasant shimmer when the wheel is thrown hard.
  if (typeof AudioEngine === 'object' && Math.abs(velocity) > 13) {
    AudioEngine.swoosh(Math.min(2, Math.abs(velocity) / 20));
  }
  let v = Math.max(-MAX_V, Math.min(MAX_V, velocity * GAIN));
  let r = rot;
  function step() {
    if (Math.abs(v) < SNAP_SPEED) {
      const target = -nearestFifthIndex(r) * 30;
      const delta  = shortestDelta(target, r);
      const dur    = 420, t0 = performance.now();
      const r0     = r;
      function snap(now) {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        applyWheelRotation(r0 + delta * e);
        if (p < 1) spinAnim = requestAnimationFrame(snap);
        else { applyWheelRotation(target); haptic(12); updatePanelsAfterSpin(); }
      }
      spinAnim = requestAnimationFrame(snap);
      return;
    }
    v *= DECEL;
    r += v;
    applyWheelRotation(r);
    spinAnim = requestAnimationFrame(step);
  }
  if (spinAnim) cancelAnimationFrame(spinAnim);
  spinAnim = requestAnimationFrame(step);
}

function selectWheelKey(majorKey) {
  if (wheelLocked) return;          // audition mode: the chord already sounded, don't move the key
  AppActions.setKey(majorKey);
}

function initWheelRoulette() {
  const svg = document.getElementById('wheelSvg'); if (!svg) return;
  let startAngle = 0, startRot = 0, lastAngle = 0, lastTime = 0, angularVelocity = 0;
  const MIN_DRAG_DEG = 4;

  function onPointerDown(e) {
    if (e.target.closest('#wheelInfoBtn')) return;
    if (spinAnim) cancelAnimationFrame(spinAnim);
    const angle  = wheelPointerAngle(e);
    startAngle   = angle;
    startRot     = wRot;
    lastAngle    = angle;
    lastTime     = performance.now();
    angularVelocity = 0;
    wheelDrag    = { moved: false };
    suppressWheelClick = false;
    InteractionController.start('wheel');
  }

  function onPointerMove(e) {
    if (!wheelDrag) return;
    const angle  = wheelPointerAngle(e);
    const delta  = shortestDelta(angle, lastAngle);
    const now    = performance.now();
    const dt     = now - lastTime;
    if (dt > 0) {
      // deg per ~16ms frame, smoothed so a flick carries but a slow turn doesn't
      const inst = delta / dt * 16;
      angularVelocity = angularVelocity * 0.55 + inst * 0.45;
    }
    lastAngle = angle;
    lastTime  = now;
    const newRot = startRot + shortestDelta(angle, startAngle);
    applyWheelRotation(newRot);
    if (Math.abs(shortestDelta(angle, startAngle)) > MIN_DRAG_DEG) {
      wheelDrag.moved    = true;
      suppressWheelClick = true;
      if (wheelLocked) setWheelLock(false);   // a deliberate spin releases the lock
    }
  }

  function onPointerUp() {
    if (!wheelDrag) return;
    const moved = wheelDrag.moved;
    wheelDrag   = null;
    InteractionController.end();
    if (moved) {
      // If the pointer was held still before release, drop the stale velocity
      // so the wheel settles in place instead of flinging.
      const idle = performance.now() - lastTime;
      const v    = idle > 90 ? 0 : angularVelocity;
      settleWheelFrom(wRot, v);
    } else {
      suppressWheelClick = false;
    }
    // Reset suppress flag after next event cycle
    if (moved) setTimeout(() => { suppressWheelClick = false; }, 80);
  }

  svg.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup',   onPointerUp,   { passive: true });
}
