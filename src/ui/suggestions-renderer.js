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
  root.innerHTML = Object.entries(MOOD_PROFILES).map(([id, p]) =>
    `<button class="mood-btn${(st.mood || 'balanced') === id ? ' active' : ''}" onclick="AppActions.setMood('${id}')">${p.label}</button>`
  ).join('');
}

function renderMoodStatus() {
  const el = document.getElementById('moodStatus'); if (!el) return;
  const p    = MOOD_PROFILES[st.mood || 'balanced'] || MOOD_PROFILES.balanced;
  const from = curDeg >= 0 ? gc()[curDeg] : gc()[0];
  el.innerHTML = `<div class="mood-copy"><b>${p.label}</b> lens · ${p.desc}</div>
    <div class="mood-weight">From ${from.degree} · ${from.chord}</div>`;
}

function renderGravityStatus() {
  const el = document.getElementById('gravityStatus'); if (!el) return;
  const fromIdx = curDeg >= 0 ? curDeg : 0;
  const c = gc()[fromIdx], g = harmonicGravity(fromIdx);
  el.innerHTML = `
    <div class="gravity-card">
      <div class="g-main">
        <span class="g-label">Harmonic gravity</span>
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
  const all     = SuggestionEngine.getNextWithScores(from);
  const current = gc()[from];
  const bubbles = all.map((it, i) => {
    // Smaller overall scale, but keep a clear size difference between strong
    // and weak suggestions. The bubble shows only the chord, centered.
    const normalized = Math.max(0, Math.min(1, (it.fit - 12) / 88));
    const d   = Math.round(40 + Math.pow(normalized, 1.85) * 78); // ~40px → ~118px
    const cat = friendlyCategory(it.transition?.category);
    return `<button class="next-bubble ${i === 0 ? 'best' : ''}"
        style="--fit:${it.fit};--d:${d}px;--rank:${i}"
        onclick="AppActions.selectDegree(${it.to},{force:true})"
        title="${it.chord.chord} · ${it.chord.degree} — ${it.reason || cat} · ${it.fit}% fit">
      <span class="nb-chord">${it.chord.chord}</span>
    </button>`;
  }).join('');

  const best = all[0];
  const hint = best
    ? `Strongest from <b>${current.chord}</b>: <b>${best.chord.chord}</b> — ${best.reason || friendlyCategory(best.transition?.category)}`
    : `The larger the circle, the stronger the next move from ${current.chord}.`;

  return `<div class="builder-next-top">
    <div>
      <div class="builder-next-title">Suggested next chords</div>
      <div class="builder-next-hint">${hint}</div>
    </div>
  </div>
  <div class="next-orbit">${bubbles}</div>`;
}

function renderProgressionStory() {
  const el = document.getElementById('progressionStory'); if (!el) return;
  el.classList.add('builder-next-moves');
  el.innerHTML = _buildBubblesHTML();
}

function renderSuggestions() {
  // The old .suggestions-section is hidden; bubbles live in the builder.
  try { moodButtons(); renderMoodStatus(); renderGravityStatus(); } catch (_) {}
  renderProgressionStory();
  const root = document.getElementById('suggestions');
  if (root) root.innerHTML = '';
}

function applyProgression(indices) {
  if (!Array.isArray(indices)) return;
  indices.forEach(i => HistoryEngine.addDegree(i));
  const last = indices[indices.length - 1];
  if (Number.isInteger(last)) AppActions.selectDegree(last, { fromHistory: true });
}
