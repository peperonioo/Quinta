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
  const steps = [
    { sel: '#wheelSvg', pad: 6, radius: '50%',
      title: { en: 'Welcome to Quinta', es: 'Bienvenido a Quinta' },
      body:  { en: 'This is the circle of fifths — music’s map. And this isn’t a video: you can touch everything as we go.',
               es: 'Esto es el círculo de quintas — el mapa de la música. Y esto no es un vídeo: puedes tocar todo mientras avanzamos.' } },
    { sel: '#wheelSvg', pad: 6, radius: '50%', interactive: true,
      title: { en: 'Right = up a fifth', es: 'Derecha = una quinta arriba' },
      body:  { en: 'Every step clockwise jumps up a fifth — C → G → D → A. Neighbours share almost every note, so they always sound good together.',
               es: 'Cada paso a la derecha sube una quinta — C → G → D → A. Las vecinas comparten casi todas sus notas, por eso suenan siempre bien juntas.' },
      try:   { en: 'Spin the wheel one step right: from C you land on G, its fifth.',
               es: 'Gira la rueda un paso a la derecha: de C caes en G, su quinta.' } },
    { sel: '#wheelSvg', pad: 6, radius: '50%', interactive: true,
      title: { en: 'Hear it, lock it', es: 'Óyelo, fíjalo' },
      body:  { en: 'Tap any chord on the wheel to hear it. Tap the centre to lock that key — the whole wheel lights up to show what belongs.',
               es: 'Toca cualquier acorde de la rueda para oírlo. Toca el centro para fijar esa tonalidad — toda la rueda se ilumina con lo que pertenece.' },
      try:   { en: 'Tap a couple of chords, then tap the centre.',
               es: 'Toca un par de acordes y luego toca el centro.' } },
    { sel: '#degrees', pad: 8, interactive: true,
      title: { en: 'The chords in your key', es: 'Los acordes de tu tonalidad' },
      body:  { en: 'Right under the wheel are your in-key chords (I to vii°) — the safe building blocks of your song.',
               es: 'Justo debajo están tus acordes en tonalidad (I a vii°) — los ladrillos seguros de tu canción.' },
      try:   { en: 'Tap one to drop it into your progression.',
               es: 'Toca uno para soltarlo en tu progresión.' } },
    { sel: '#progressionBuilder', pad: 8, interactive: true,
      title: { en: 'Build & play', es: 'Construye y suena' },
      body:  { en: 'Your chords land here on a grid. Drag to move them, hold one to lift it, set lengths — then hit Play.',
               es: 'Tus acordes caen aquí en un grid. Arrastra para moverlos, mantén pulsado para levantar uno, ajusta duraciones — y pulsa Play.' },
      try:   { en: 'Add a few chords and press Play.',
               es: 'Añade unos acordes y pulsa Play.' } },
    { sel: '#progressionStory', pad: 8, interactive: true,
      title: { en: 'Let it guide you', es: 'Deja que te guíe' },
      body:  { en: 'Stuck on what’s next? These bubbles suggest the strongest moves — the biggest one is the best bet.',
               es: '¿No sabes qué sigue? Estas burbujas sugieren los movimientos más fuertes — la más grande es la mejor apuesta.' },
      try:   { en: 'Tap a bubble to add that chord.',
               es: 'Toca una burbuja para añadir ese acorde.' } },
    { sel: '.tabs', pad: 8, place: 'below',
      title: { en: 'Produce & take it anywhere', es: 'Produce y llévatelo' },
      body:  { en: 'Switch to Production for drums and a groove synced to your tempo. You’re ready — start sketching!',
               es: 'Cambia a Producción para batería y un groove a tu tempo. ¡Listo — a bocetar!' } },
  ];

  let idx = 0, _reflowRAF = 0, _scrollT = 0, _anchorY = 0, _settling = false;
  const SCROLL_LIMIT = 60;   // you can nudge the page a little, but not scroll away from the step

  // Keep the page near the current step: allow a short scroll range, then stop.
  function _clampScroll() {
    if (_settling) return;
    const y = window.scrollY || 0;
    if (y > _anchorY + SCROLL_LIMIT)      window.scrollTo(0, _anchorY + SCROLL_LIMIT);
    else if (y < _anchorY - SCROLL_LIMIT) window.scrollTo(0, _anchorY - SCROLL_LIMIT);
  }
  function _onScroll() { _clampScroll(); _reflow(); }

  function shouldShow() { return !st.onboarded; }
  function markSeen() { if (!st.onboarded) { st.onboarded = true; if (typeof saveState === 'function') saveState(); } }
  const $ = id => document.getElementById(id);

  function open(force) {
    if (!force && !shouldShow()) return;
    const ov = $('onboarding'); if (!ov) return;
    // The tour points at Theory-panel elements — make sure that tab is showing.
    const theoryBtn = document.querySelector('.tabs .tab-btn');
    if (theoryBtn && !theoryBtn.classList.contains('active')) theoryBtn.click();
    idx = 0;
    ov.hidden = false;
    requestAnimationFrame(() => ov.classList.add('ob-on'));
    document.addEventListener('keydown', _key, true);
    window.addEventListener('resize', _reflow, true);
    window.addEventListener('scroll', _onScroll, true);
    go(0);
  }
  function close() {
    const ov = $('onboarding'); if (!ov) return;
    ov.classList.remove('ob-on');
    document.removeEventListener('keydown', _key, true);
    window.removeEventListener('resize', _reflow, true);
    window.removeEventListener('scroll', _onScroll, true);
    setTimeout(() => { ov.hidden = true; }, 300);
  }
  function skip()   { markSeen(); close(); }
  function finish() { markSeen(); close(); }
  function next()   { if (idx >= steps.length - 1) return finish(); go(idx + 1); }
  function prev()   { if (idx > 0) go(idx - 1); }
  function go(i) {
    idx = Math.max(0, Math.min(steps.length - 1, i));
    render();
    const el = document.querySelector(steps[idx].sel);
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
    if (tryEl) { tryEl.hidden = !s.try; if (s.try) tryEl.textContent = L(s.try); }
    const tip = $('obTip');
    if (tip) { tip.classList.remove('ob-fade'); void tip.offsetWidth; tip.classList.add('ob-fade'); }
    if ($('obDots')) $('obDots').innerHTML = steps.map((_, i) =>
      `<button class="ob-dot${i === idx ? ' on' : ''}" aria-label="Step ${i + 1}" onclick="Onboarding.go(${i})"></button>`).join('');
    const back = $('obBack'), nextB = $('obNext'), skipB = $('obSkip');
    if (back)  { back.style.visibility = idx === 0 ? 'hidden' : 'visible'; back.textContent = es() ? 'Atrás' : 'Back'; }
    if (skipB) skipB.textContent = es() ? 'Saltar' : 'Skip';
    if (nextB) nextB.textContent = idx === n - 1 ? (es() ? 'Empezar a crear' : 'Start creating') : (es() ? 'Siguiente' : 'Next');
  }

  function position() {
    const s = steps[idx];
    const el = document.querySelector(s.sel);
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
