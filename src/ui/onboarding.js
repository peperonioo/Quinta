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
  const steps = [
    { sel: '#wheelSvg', pad: 6, radius: '50%',
      title: { en: 'Start with the wheel', es: 'Empieza por el círculo' },
      body:  { en: 'Welcome! This is the circle of fifths. Spin it to choose your key, tap any chord to hear it, and tap the centre to lock the key — every chord that belongs to it lights up.',
               es: '¡Bienvenido! Esto es el círculo de quintas. Gíralo para elegir tu tonalidad, toca cualquier acorde para escucharlo y toca el centro para bloquear el key — se iluminan todos los acordes que le pertenecen.' } },
    { sel: '#degrees', pad: 8,
      title: { en: 'The chords in your key', es: 'Los acordes de tu tonalidad' },
      body:  { en: 'Right below the wheel are your diatonic chords — the degrees I to vii°. Tap any one to add it to your progression.',
               es: 'Justo debajo de la rueda están tus acordes diatónicos — los grados I a vii°. Toca cualquiera para añadirlo a tu progresión.' } },
    { sel: '#progressionBuilder', pad: 8,
      title: { en: 'Build your progression', es: 'Construye tu progresión' },
      body:  { en: 'Your chords land here. Drag bars to reorder, set each chord’s length, then hit Play. Export to MIDI, share a link or save it to your library.',
               es: 'Tus acordes aparecen aquí. Arrastra para reordenar, ajusta la duración de cada acorde y pulsa Play. Exporta a MIDI, comparte un link o guárdalo en tu biblioteca.' } },
    { sel: '#progressionStory', pad: 8,
      title: { en: 'Let it guide you', es: 'Deja que te guíe' },
      body:  { en: 'Not sure what comes next? These bubbles suggest the strongest moves for your genre and mood — the biggest bubble is the best one.',
               es: '¿No sabes qué sigue? Estas burbujas sugieren los movimientos más fuertes según tu género y mood — la burbuja más grande es la mejor.' } },
    { sel: '.drawers', pad: 8,
      title: { en: 'See it on real instruments', es: 'Míralo en instrumentos reales' },
      body:  { en: 'Every chord lights up on the piano and the nylon guitar, so you see exactly how to play it — with chord shapes and triads right on the fretboard.',
               es: 'Cada acorde se ilumina en el piano y en la guitarra de nylon, así ves cómo tocarlo — con diagramas de acordes y tríadas en el mástil.' } },
    { sel: '.tabs', pad: 8, place: 'below',
      title: { en: 'Produce & export', es: 'Produce y exporta' },
      body:  { en: 'Switch to Production for 808/909 drums and a groove synced to your tempo. Then take your idea anywhere. You’re ready — start creating!',
               es: 'Cambia a Producción para batería 808/909 y un groove sincronizado a tu tempo. Luego llévate tu idea a donde quieras. ¡Listo — a crear!' } },
  ];

  let idx = 0, _reflowRAF = 0, _scrollT = 0;

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
    window.addEventListener('scroll', _reflow, true);
    go(0);
  }
  function close() {
    const ov = $('onboarding'); if (!ov) return;
    ov.classList.remove('ob-on');
    document.removeEventListener('keydown', _key, true);
    window.removeEventListener('resize', _reflow, true);
    window.removeEventListener('scroll', _reflow, true);
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
    if (el) {
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) { el.scrollIntoView(); }
      requestAnimationFrame(position);
      clearTimeout(_scrollT); _scrollT = setTimeout(position, 400);
    } else { position(); }
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
