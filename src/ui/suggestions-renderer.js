// ── SUGGESTIONS RENDERER ──────────────────────────────
// Renders Klimper-style weighted suggestion bubbles.

function _metricBar(label, value, type, shortClass) {
  const hot = value >= 70;
  return `<div class="metric-line">
    <span class="metric-name ${shortClass}"><span>${label}</span></span>
    <span class="metric-track"><i class="metric-fill ${type || ''} ${hot ? 'hot' : ''}" style="width:${clamp(value, 0, 100)}%"></i></span>
  </div>`;
}

function renderMeter(label, value) {
  const cls = value >= 72 ? 'high' : value >= 45 ? 'medium' : 'low';
  return `<div class="meter-row ${cls}">
    <div class="meter-label">${label}</div>
    <div class="meter"><span style="width:${clamp(value)}%"></span></div>
    <div class="meter-num">${clamp(value)}</div>
  </div>`;
}

function moodButtons() {
  const root = document.getElementById('moodLens'); if (!root) return;
  root.innerHTML = Object.keys(MOOD_PROFILES).map(id =>
    `<button class="mood-btn${(st.mood || 'balanced') === id ? ' active' : ''}" onclick="AppActions.setMood('${id}')">${moodLabel(id)}</button>`
  ).join('');
}

function renderMoodStatus() {
  const el = document.getElementById('moodStatus'); if (!el) return;
  const id   = st.mood || 'balanced';
  const from = curDeg >= 0 ? gc()[curDeg] : gc()[0];
  const lens = st.lang === 'es' ? `<b>${moodLabel(id)}</b> · ${moodDesc(id)}` : `<b>${moodLabel(id)}</b> lens · ${moodDesc(id)}`;
  el.innerHTML = `<div class="mood-copy">${lens}</div>
    <div class="mood-weight">${t('mood.from')} ${from.degree} · ${from.chord}</div>`;
}

function renderGravityStatus() {
  const el = document.getElementById('gravityStatus'); if (!el) return;
  const fromIdx = curDeg >= 0 ? curDeg : 0;
  const c = gc()[fromIdx], g = harmonicGravity(fromIdx);
  el.innerHTML = `
    <div class="gravity-card">
      <div class="g-main">
        <span class="g-label">${t('gravity.title')}</span>
        <span class="g-value">${c.chord}</span>
        <span class="g-sub">${c.degree} · ${g.name} · ${g.role}</span>
      </div>
      <div class="gravity-pill-row">
        ${metricPill('Resolution', g.resolution)}
        ${metricPill('Tension',    g.tension)}
        ${metricPill('Motion',     g.movement)}
      </div>
    </div>`;
}

function _buildBubblesHTML() {
  const from    = curDeg >= 0 ? curDeg : 0;
  const all     = SuggestionEngine.getNextWithScores(from); // strongest first
  const current = gc()[from];

  // Quantize each suggestion's strength into one of 4 sizes (the strongest is
  // clearly the biggest). Bubbles are then laid out in DEGREE order (I…VII).
  const SIZES   = [38, 48, 60, 74];       // 4 tiers; biggest stays modest
  const fits    = all.map(x => x.fit);
  const mn = Math.min(...fits), mx = Math.max(...fits);
  const tier = (fit) => {
    const n = mx > mn ? (fit - mn) / (mx - mn) : 1;
    return Math.min(3, Math.floor(n * 4));
  };
  const bestTo  = all[0]?.to;
  const byDegree = [...all].sort((a, b) => a.to - b.to);
  const es = st.lang === 'es';

  const bubbles = byDegree.map((it, i) => {
    const t   = tier(it.fit);
    const d   = SIZES[t];
    const cat = friendlyCategory(it.transition?.category);
    const flN = ['nbFloatA', 'nbFloatB', 'nbFloatC'][i % 3];
    const flD = (3.6 + (i % 4) * 0.5).toFixed(2);
    const flDelay = (-i * 0.55).toFixed(2);
    const enter = (0.05 + i * 0.06).toFixed(2);
    const spD = (4 + (i % 3) * 1.3).toFixed(1);
    // Liquid-gel bubble: layered body (gloss + living specular + ripple). Float &
    // press/tap/drag physics are driven by BubbleField (a spring rAF), wired on render.
    return `<button class="next-bubble ${it.to === bestTo ? 'best' : ''}"
        style="--fit:${it.fit};--d:${d}px;--tier:${t};animation:nbEnter .55s cubic-bezier(.34,1.56,.5,1) ${enter}s both"
        data-to="${it.to}" data-best="${it.to === bestTo ? 1 : 0}"
        aria-label="${es ? `Añadir ${it.chord.chord} (${it.chord.degree}), ${it.fit}% de encaje. Arrástrala a la timeline para colocarla.` : `Add ${it.chord.chord} (${it.chord.degree}), ${it.fit}% fit. Drag onto the timeline to place it.`}"
        title="${it.chord.degree} · ${it.chord.chord} — ${it.reason || cat} · ${it.fit}% ${es ? 'encaje · toca para añadir, arrastra para colocar' : 'fit · tap to add, drag to place'}">
      <span class="nb-glow"></span>
      <span class="nb-float" style="animation:${flN} ${flD}s ease-in-out ${flDelay}s infinite">
        <span class="nb-body">
          <span class="nb-gloss"></span>
          <span class="nb-spec" style="animation:nbSpec ${spD}s ease-in-out ${flDelay}s infinite"></span>
          <span class="nb-rip"></span>
          <span class="nb-deg">${casedRoman(it.chord.degree, it.chord.quality)}</span>
          <span class="nb-chord">${it.chord.chord}</span>
        </span>
      </span>
    </button>`;
  }).join('');

  // The bubbles speak for themselves — bigger = stronger move — so the title and
  // the "strongest move" prose are dropped to keep the builder clean.
  return `<div class="next-orbit">${bubbles}</div>`;
}

// ── Tap a suggestion → quick add; drag → place (V4.6) ─
// Tapping a bubble adds the chord at the end (with the fly-to-pill animation).
// Variant choices live only in the progression builder, to keep the suggestion
// flow fast. Dragging a bubble drops it at a position in the timeline (Klimper).
function addSuggestion(to, ev) {
  if (SuggestionDrag.suppressClick) return;        // a drag just handled this
  const bubble = ev?.currentTarget;
  const from   = bubble?.getBoundingClientRect();
  const chord  = bubble?.querySelector('.nb-chord')?.textContent || '';
  if (typeof AudioEngine === 'object') AudioEngine.playChord(chordPitchesForDegree(to));
  AppActions.selectDegree(to, { force: true });
  if (!from || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  requestAnimationFrame(() => {
    const pill   = document.querySelector('.builder-step:last-of-type');
    const target = pill?.getBoundingClientRect();
    if (target) _flyGhost(from, target, chord);
  });
}

// Drag a suggestion bubble onto the timeline to insert it at a position.
const SuggestionDrag = {
  suppressClick: false, _ghost: null, _target: -1,
  start(e, to) {
    const startX = e.clientX, startY = e.clientY;
    const row = document.getElementById('flowRow');
    let dragging = false;
    const chord = gc()[to]?.chord || '';
    const move = ev => {
      if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) {
        dragging = true;
        this._ghost = document.createElement('div');
        this._ghost.className = 'drag-ghost'; this._ghost.textContent = chord;
        document.body.appendChild(this._ghost);
      }
      if (!dragging) return;
      ev.preventDefault();
      this._ghost.style.left = ev.clientX + 'px';
      this._ghost.style.top  = ev.clientY + 'px';
      this._target = this._insertIndex(row, ev.clientX, ev.clientY);
      this._marker(row, this._target);
    };
    const up = ev => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (this._ghost) { this._ghost.remove(); this._ghost = null; }
      this._clearMarker();
      if (dragging) {
        if (this._target >= 0) {
          if (typeof AudioEngine === 'object') AudioEngine.playChord(chordPitchesForDegree(to));
          HistoryEngine.addDegree(to, { at: this._target });
        }
        this.suppressClick = true;
        setTimeout(() => { this.suppressClick = false; }, 60);
      }
      this._target = -1;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  },
  // Where would a drop at (x,y) insert? Returns an index, or -1 if not over the row.
  _insertIndex(row, x, y) {
    if (!row) return -1;
    const r = row.getBoundingClientRect();
    if (y < r.top - 40 || y > r.bottom + 40 || x < r.left - 30 || x > r.right + 30) return -1;
    const bars = [...row.querySelectorAll('.builder-step')];
    let idx = bars.length;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i].getBoundingClientRect();
      if (x < b.left + b.width / 2) { idx = i; break; }
    }
    return idx;
  },
  _marker(row, idx) {
    if (!row) return;
    let m = document.getElementById('dropMarker');
    if (idx < 0) { if (m) m.style.display = 'none'; return; }
    if (!m) { m = document.createElement('div'); m.id = 'dropMarker'; m.className = 'drop-marker'; row.appendChild(m); }
    const bars = [...row.querySelectorAll('.builder-step')];
    let left;
    if (!bars.length) left = 4;
    else if (idx >= bars.length) { const b = bars[bars.length - 1]; left = b.offsetLeft + b.offsetWidth + 2; }
    else left = bars[idx].offsetLeft - 3;
    m.style.display = 'block';
    m.style.transform = `translateX(${left}px)`;
  },
  _clearMarker() { const m = document.getElementById('dropMarker'); if (m) m.style.display = 'none'; },
};

// Fly a gel ghost of the tapped bubble into its new pill — it shrinks and arcs
// across, quick and smooth, so the chord visibly "travels" into the progression.
function _flyGhost(from, to, chord) {
  const g = document.createElement('div');
  g.className = 'fly-ghost';
  g.textContent = chord;
  g.style.left = from.left + 'px'; g.style.top = from.top + 'px';
  g.style.width = from.width + 'px'; g.style.height = from.height + 'px';
  document.body.appendChild(g);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top  + to.height / 2) - (from.top  + from.height / 2);
  const arc = Math.min(-28, -Math.abs(dx) * 0.12);     // slight lift mid-flight
  const anim = g.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + arc}px) scale(.66)`, opacity: 1, offset: .5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.24)`, opacity: 0, offset: 1 },
  ], { duration: 400, easing: 'cubic-bezier(.42,.04,.24,1)' });
  const done = () => g.remove();
  anim.onfinish = done; anim.oncancel = done;
  setTimeout(() => { if (g.isConnected) g.remove(); }, 700);
}

function renderProgressionStory() {
  const el = document.getElementById('progressionStory'); if (!el) return;
  el.classList.add('builder-next-moves');
  el.innerHTML = _buildBubblesHTML();
  if (typeof BubbleField === 'object') BubbleField.mount();
}

function renderSuggestions() {
  // The old .suggestions-section is hidden; bubbles live in the builder.
  try { moodButtons(); renderMoodStatus(); renderGravityStatus(); } catch (_) {}
  renderProgressionStory();
  const root = document.getElementById('suggestions');
  if (root) root.innerHTML = '';
}
