// ── ONBOARDING / GUIDED SPOTLIGHT TOUR ────────────────
// A guided first-run tour that dims the whole page and spotlights each real UI
// element in place — the wheel, the chords below it, the builder, the
// suggestions, the instruments and production — with a tooltip explaining what
// each does. Shown once (st.onboarded); re-openable from the header "?" button.
// Bilingual EN/ES inside the module (no i18n-file churn).
const Onboarding = (() => {
  const L = o => (o && (o[st.lang] || o.en)) || '';
  const es = () => st.lang === 'es';

  // Each step spotlights a real element. `sel` = target, `pad` = halo padding,
  // `radius` = spotlight corner radius, `place` = preferred tooltip side.
  // Interactive tour: `interactive` steps let you actually touch the highlighted
  // element (the click-catcher goes click-through); `try` is the do-this prompt.
  // B4 — three steps, not seven. The old tour existed to compensate for a screen
  // that did not explain itself: 143 controls with no hierarchy. After the
  // restructure there is far less to explain, so the tour shrinks to the three
  // things that actually matter — and only ONE step is gated, not five. A tour
  // that makes you wait is a tax on the exact moment you were most curious.
  const steps = [
    // V6.34 — the tour follows the tabs. The old script opened on the FIRST tab
    // button (Explore, post-restructure) and then asked for a button that lives
    // in Build: an impossible instruction as the user's first minute. Each step
    // now declares its mode and go() switches to it — the tour walks the same
    // four rooms the app has.
    { mode: 'explore', sel: '#wg', pad: 10, radius: 999, interactive: true,
      title: { en: 'The wheel writes', es: 'La rueda escribe' },
      body:  { en: 'Spin it to choose your key. The bright wedges are the chords that belong to it — tap one and it goes straight into your song.',
               es: 'Gírala para elegir tonalidad. Los sectores iluminados son los acordes que le pertenecen — toca uno y entra directo en tu canción.' },
      try:   { en: 'Tap a bright wedge.', es: 'Toca un sector iluminado.' },
      done:  c => (st.history || []).length > c.hist },
    { mode: 'build', sel: '#progressionStory', pad: 8, interactive: true,
      title: { en: 'Follow the pull', es: 'Sigue el tirón' },
      body:  { en: 'This is your document. The bubbles are what goes well next — bigger means stronger pull. Tap one to add it, or drag it onto the timeline.',
               es: 'Este es tu documento. Las burbujas son lo que va bien después — más grande, más tirón. Toca una para añadirla, o arrástrala a la línea de tiempo.' },
      try:   { en: 'Tap a bubble.', es: 'Toca una burbuja.' },
      done:  c => (st.history || []).length > c.hist },
    { mode: 'build', sel: '#docBar', pad: 8, interactive: true,
      title: { en: 'Hear it', es: 'Escúchala' },
      body:  { en: 'One Play runs the whole song — switch the rhythm track on and the drums join in. When it sounds right, Export gives you WAV, stems or MIDI.',
               es: 'Un solo Play toca toda la canción — enciende la pista de ritmo y entra la batería. Cuando suene bien, Exportar te da WAV, stems o MIDI.' },
      try:   { en: 'Press Play.', es: 'Dale a Play.' },
      done:  () => (typeof playing !== 'undefined' && playing)
               || (typeof _progRAF !== 'undefined' && _progRAF) },
    { mode: 'instrument', sel: '.drawers', pad: 8,
      title: { en: 'Now play it yourself', es: 'Ahora tócala tú' },
      body:  { en: 'Your instrument, full size: the scale on the neck, finger shapes for every chord. “Chord?” names whatever you fret, and the tuning fork opens a tuner.',
               es: 'Tu instrumento a tamaño completo: la escala en el mástil y las posiciones de cada acorde. «¿Acorde?» nombra lo que pises, y el diapasón abre el afinador.' } },
  ];


  let idx = 0, _reflowRAF = 0, _scrollT = 0, _anchorY = 0, _settling = false;
  const SCROLL_LIMIT = 60;   // you can nudge the page a little, but not scroll away from the step

  // ── Do-it-to-continue gating ─────────────────────────
  // Steps with a `done` predicate LOCK the Next button until the user actually
  // performs the action (we snapshot state on entry and poll). A generous 25s
  // fallback unlocks regardless — the tour must never trap anyone.
  let _locked = false, _ctx = null, _watchT = 0, _watchStart = 0, _tapEl = null;
  const UNLOCK_FALLBACK_MS = 25000;
  function _countTap() { if (_ctx) _ctx.taps++; }
  function _stopWatch() {
    clearInterval(_watchT); _watchT = 0;
    if (_tapEl) { _tapEl.removeEventListener('pointerdown', _countTap, true); _tapEl = null; }
  }
  function _startWatch(s) {
    _stopWatch();
    _locked = !!s.done;
    if (!_locked) return;
    _ctx = { key: st.key, hist: (st.history || []).length, taps: 0 };
    _tapEl = _targetEl(s);
    if (_tapEl) _tapEl.addEventListener('pointerdown', _countTap, true);
    _watchStart = Date.now();
    _watchT = setInterval(() => {
      let ok = false;
      try { ok = !!s.done(_ctx); } catch (_) {}
      if (ok || Date.now() - _watchStart > UNLOCK_FALLBACK_MS) _unlock(ok);
    }, 280);
  }
  function _unlock(earned) {
    _stopWatch();
    if (!_locked) return;
    _locked = false;
    const nextB = $('obNext');
    if (nextB) { nextB.disabled = false; nextB.classList.add('ob-unlocked'); }
    const tryEl = $('obTry');
    if (tryEl && earned) {
      tryEl.classList.add('ob-done');
      tryEl.innerHTML = (typeof icon === 'function' ? icon('check', 13) : '') +
        '<span>' + (es() ? '¡Eso es! Sigue cuando quieras.' : 'That’s it! Continue when ready.') + '</span>';
    }
    if (earned) haptic('ok');
  }

  // Keep the page near the current step: allow a short scroll range, then stop.
  function _clampScroll() {
    if (_settling) return;
    const y = window.scrollY || 0;
    if (y > _anchorY + SCROLL_LIMIT)      window.scrollTo(0, _anchorY + SCROLL_LIMIT);
    else if (y < _anchorY - SCROLL_LIMIT) window.scrollTo(0, _anchorY - SCROLL_LIMIT);
  }
  function _onScroll() { _clampScroll(); _reflow(); }

  function shouldShow() { return !st.onboarded; }
  function markSeen() { if (!st.onboarded) { st.onboarded = true; saveState(); } }
  const $ = id => document.getElementById(id);
  // Resolve a step's target, falling back to selAlt when the primary isn't in the
  // DOM (e.g. the .surprise-btn hero only exists while the builder is empty).
  const _targetEl = s => document.querySelector(s.sel) || (s.selAlt ? document.querySelector(s.selAlt) : null);

  function open(force) {
    if (!force && !shouldShow()) return;
    const ov = $('onboarding'); if (!ov) return;
    idx = 0;
    ov.hidden = false;
    requestAnimationFrame(() => ov.classList.add('ob-on'));
    document.addEventListener('keydown', _key, true);
    window.addEventListener('resize', _reflow, true);
    window.addEventListener('scroll', _onScroll, true);
    go(0);
  }
  function close() {
    _stopWatch(); _locked = false;
    const ov = $('onboarding'); if (!ov) return;
    ov.classList.remove('ob-on');
    document.removeEventListener('keydown', _key, true);
    window.removeEventListener('resize', _reflow, true);
    window.removeEventListener('scroll', _onScroll, true);
    setTimeout(() => { ov.hidden = true; }, 300);
  }
  // ── Funnel telemetry ─────────────────────────────────
  // The tour is the most likely drop-off point in the whole product (7 steps, 5 of
  // them gated). Without these two events a low D7 is unreadable: you cannot tell
  // "the product doesn't stick" from "nobody got past step 3".
  function _telEnd(done) {
    tel('onboard_end', { step: idx + 1, of: steps.length, done: !!done });
  }
  function skip()   { _telEnd(false); markSeen(); close(); }
  function finish() { _telEnd(true);  markSeen(); close(); }
  function next()   { if (idx >= steps.length - 1) return finish(); go(idx + 1); }
  function prev()   { if (idx > 0) go(idx - 1); }
  function go(i) {
    idx = Math.max(0, Math.min(steps.length - 1, i));
    const s = steps[idx];
    if (s.mode && document.body.dataset.mode !== s.mode && typeof switchTab === 'function') switchTab(s.mode);
    // A leftover selection puts the inspector sheet over whatever this step
    // spotlights (the wheel-add of step 1 selects the chord it added, and the
    // sheet then buried step 2's bubbles). Every step starts on a clean stage.
    if (typeof Inspector === 'object') Inspector.clear();
    tel('onboard_step', { step: idx + 1, of: steps.length });
    render();
    _startWatch(steps[idx]);
    const el = _targetEl(steps[idx]);
    _settling = true;                                  // don't clamp while we scroll the target into view
    if (el) {
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) { el.scrollIntoView(); }
      requestAnimationFrame(position);
      clearTimeout(_scrollT);
      _scrollT = setTimeout(() => { position(); _anchorY = window.scrollY || 0; _settling = false; }, 500);
    } else {
      position(); _anchorY = window.scrollY || 0; _settling = false;
    }
  }

  function _key(e) {
    if (e.key === 'Escape')          { e.stopPropagation(); skip(); }
    else if (e.key === 'ArrowRight') { e.stopPropagation(); next(); }
    else if (e.key === 'ArrowLeft')  { e.stopPropagation(); prev(); }
  }
  function _reflow() {
    if (_reflowRAF) return;
    _reflowRAF = requestAnimationFrame(() => { _reflowRAF = 0; position(); });
  }

  function render() {
    const s = steps[idx], n = steps.length;
    if ($('obStep'))  $('obStep').textContent = `${String(idx + 1).padStart(2, '0')} · ${String(n).padStart(2, '0')}`;
    if ($('obTitle')) $('obTitle').textContent = L(s.title);
    if ($('obText'))  $('obText').textContent = L(s.body);
    // Interactive steps let you touch the highlighted element (CSS makes the
    // click-catcher click-through); show the "try this" prompt.
    const ov = $('onboarding'); if (ov) ov.classList.toggle('ob-interactive', !!s.interactive);
    const tryEl = $('obTry');
    if (tryEl) { tryEl.hidden = !s.try; tryEl.classList.remove('ob-done'); if (s.try) tryEl.textContent = L(s.try); }
    const tip = $('obTip');
    if (tip) { tip.classList.remove('ob-fade'); void tip.offsetWidth; tip.classList.add('ob-fade'); }
    if ($('obDots')) $('obDots').innerHTML = steps.map((_, i) =>
      `<button class="ob-dot${i === idx ? ' on' : ''}" aria-label="Step ${i + 1}" data-act="tour.go" data-idx="${i}"></button>`).join('');
    const back = $('obBack'), nextB = $('obNext'), skipB = $('obSkip');
    if (back)  { back.style.visibility = idx === 0 ? 'hidden' : 'visible'; back.textContent = es() ? 'Atrás' : 'Back'; }
    if (skipB) skipB.textContent = es() ? 'Saltar' : 'Skip';
    if (nextB) {
      nextB.textContent = idx === n - 1 ? (es() ? 'Empezar a crear' : 'Start creating') : (es() ? 'Siguiente' : 'Next');
      nextB.disabled = !!s.done;                        // locked until the action is done
      nextB.classList.remove('ob-unlocked');
      nextB.title = s.done ? (es() ? 'Prueba lo de arriba para seguir' : 'Try the step above to continue') : '';
    }
  }

  function position() {
    const s = steps[idx];
    const el = _targetEl(s);
    const spot = $('obSpot'), tip = $('obTip');
    if (!spot || !tip) return;
    const r = el && el.getBoundingClientRect();
    // No (or zero-size) target → no spotlight, centre the tooltip.
    if (!r || r.width < 2 || r.height < 2) {
      spot.classList.add('ob-spot-hidden');
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(10, (innerWidth - tw) / 2) + 'px';
      tip.style.top  = Math.max(10, (innerHeight - th) / 2) + 'px';
      return;
    }
    spot.classList.remove('ob-spot-hidden');
    const pad = s.pad ?? 8;
    let x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
    // Clamp to viewport so the halo never bleeds off-screen.
    x = Math.max(6, x); y = Math.max(6, y);
    w = Math.min(w, innerWidth - x - 6); h = Math.min(h, innerHeight - y - 6);
    spot.style.left = x + 'px'; spot.style.top = y + 'px';
    spot.style.width = w + 'px'; spot.style.height = h + 'px';
    spot.style.borderRadius = s.radius || '16px';

    // Place the tooltip on the side with the most room.
    const tw = Math.min(340, innerWidth - 24), th = tip.offsetHeight, gap = 14;
    tip.style.width = tw + 'px';
    let top;
    const below = y + h + gap, above = y - gap - th;
    if (s.place === 'below' && below + th + 6 <= innerHeight) top = below;
    else if (below + th + 6 <= innerHeight) top = below;
    else if (above >= 6) top = above;
    else top = Math.max(6, innerHeight - th - 12);
    let left = x + w / 2 - tw / 2;
    left = Math.max(10, Math.min(left, innerWidth - tw - 10));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  return { open, close, skip, next, prev, go, shouldShow };
})();
