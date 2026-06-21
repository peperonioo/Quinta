// ── TABS & PRODUCTION RENDERER ────────────────────────

function switchTab(tab, btn) {
  if (typeof tel === 'function') tel('tab', { tab });
  const tabsEl = btn?.closest?.('.tabs');
  if (tabsEl) {
    const buttons = [...tabsEl.querySelectorAll('.tab-btn')];
    const i = Math.max(0, buttons.indexOf(btn));
    tabsEl.style.setProperty('--tab-x', `calc(${i} * 100%)`);
  }
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('panel-theory').style.display     = tab === 'theory'     ? 'block' : 'none';
  document.getElementById('panel-production').style.display = tab === 'production' ? 'block' : 'none';
  document.body.dataset.tab = tab;            // drives the instrument dock visibility
  if (tab === 'production') { renderProduction(); applyI18n(); }
}

function setGenre(id, btn) {
  if (!GENRES[id]) return;
  curGenre = id;
  stopPlay();
  st.genre = id;
  saveState();
  document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProduction();
  applyI18n();
}

// Resolve a Production string for the current language. Strings may be plain
// (English-only, e.g. drum-row labels) or {en, es} — falls back to en.
function PL(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? (v[st.lang] ?? v.en) : v; }

function _ae(e) {
  let icon = e.icon;
  if (e.anim === 'stab') icon = `<div class="stab-icon"><div class="sk"></div><div class="sk bk"></div><div class="sk"></div><div class="sk bk"></div><div class="sk"></div></div>`;
  else if (e.anim === 'bass') icon = `<div class="bass-icon"><div class="bb"></div><div class="bb"></div><div class="bb"></div><div class="bb"></div><div class="bb"></div></div>`;
  const gear = e.gear ? `<span class="el-gear">${e.gear}</span>` : '';
  return `<div class="element-item"><div class="element-icon">${icon}</div><div class="el-body"><div class="el-name">${PL(e.name)}${gear}</div><div class="el-desc">${PL(e.desc)}</div></div></div>`;
}

function renderProduction() {
  const g = GENRES[curGenre]; if (!g) return;
  const ptEl = document.getElementById('prodTitle');
  if (ptEl) ptEl.textContent = g.title;
  const pmEl = document.getElementById('prodMeta');
  if (pmEl) pmEl.textContent = `${g.bpm} BPM · ${PL(g.sub)}`;
  const bbEl = document.getElementById('bpmBadge');
  if (bbEl) bbEl.textContent = `${st.bpm || 120} BPM`;        // shared tempo (metronome / progression)
  const sbEl = document.getElementById('bpmSuggest');
  if (sbEl) {
    sbEl.textContent = `≈ ${g.bpm}`;
    sbEl.title = st.lang === 'es'
      ? `Usar el tempo sugerido de ${g.title} (${g.bpm} BPM)`
      : `Use the suggested ${g.title} tempo (${g.bpm} BPM)`;
    sbEl.onclick = () => {
      st.bpm = g.bpm; saveState();
      if (typeof Metronome === 'object') Metronome.render();
      renderProduction();
    };
  }
  const pkn = document.getElementById('prodKeyNote');
  if (pkn) pkn.textContent = displayKeyLabel();
  const pkm = document.getElementById('prodKeyMode');
  if (pkm) pkm.textContent = gm().name;
  const pc = document.getElementById('prodCards');
  if (pc) pc.innerHTML = g.cards.map(c =>
    `<div class="prod-card"><h3>${PL(c.h)}</h3><div class="bigline">${PL(c.b)}</div><p>${PL(c.p)}</p></div>`
  ).join('');
  const mg = document.getElementById('midiGrid');
  if (mg) mg.innerHTML = g.pattern.map((r, ri) =>
    `<div class="midi-row" style="grid-template-columns:60px repeat(16,1fr);gap:3px">
      <div class="midi-label">${r.label}</div>
      ${r.p.map((v, i) =>
        `<div class="step${v ? ' on '+r.cl : ''} ${i % 4 === 0 ? 'beat-1' : ''}" id="s-${ri}-${i}"></div>`
      ).join('')}
    </div>`
  ).join('');
  const es = document.getElementById('elementsSection');
  if (es) es.innerHTML = `
    <div class="elements-card"><h3>${t('production.instruments')}</h3>${g.elements.slice(0,3).map(_ae).join('')}</div>
    <div class="elements-card"><h3>${t('production.more')}</h3>${g.elements.slice(3).map(_ae).join('')}</div>`;
  const pl = document.getElementById('progList');
  if (pl) pl.innerHTML = g.progressions.map(pr =>
    `<div class="prog-item">
      <div class="prog-chords">${pr.chords.map(c => `<span class="prog-chord">${c}</span>`).join('')}</div>
      <div class="prog-desc">${PL(pr.desc)}</div>
    </div>`
  ).join('');
  const gr2 = document.getElementById('grooveRules');
  if (gr2) gr2.innerHTML = g.groove.map((r, i) =>
    `<div class="groove-rule">
      <div class="rule-num">${String(i+1).padStart(2,'0')}</div>
      <div class="rule-text">${PL(r)}</div>
    </div>`
  ).join('');
  const tp = document.getElementById('prodTips');
  if (tp) tp.innerHTML = (g.tips || []).map(sec =>
    `<div class="tips-card"><h4>${PL(sec.h)}</h4><ul>${sec.items.map(i => `<li>${PL(i)}</li>`).join('')}</ul></div>`
  ).join('');
}

// ── Connected groove player (V4.9) ────────────────────
// Plays the genre's drum pattern + the user's PROGRESSION (voiced & voice-led)
// + an 808 sub-bass, all on a lookahead scheduler synced to st.bpm (shared with
// the metronome). With no progression it just plays the beat.
let _prodNext = 0, _prodStep = 0, _prodBar = 0, _prodPrevUpper = null, _prodVoicing = null;

function togglePlay() { if (playing) stopPlay(); else startPlay(); }

function startPlay() {
  if (typeof AudioEngine !== 'object' || !AudioEngine.resume()) return;
  playing = true; _prodStep = 0; _prodBar = 0; _prodPrevUpper = null; _prodVoicing = null;
  const playBtn = document.getElementById('playBtn');
  if (playBtn) { playBtn.classList.add('playing'); const l = playBtn.querySelector('span'); if (l) l.textContent = t('play.stop'); if (typeof setIcon === 'function') setIcon(playBtn, 'stop'); }
  _prodNext = AudioEngine.now() + 0.08;
  pInterval = setInterval(_prodSchedule, 25);
}

function stopPlay() {
  playing = false;
  clearInterval(pInterval); pInterval = null;
  if (typeof AudioEngine === 'object') AudioEngine.killVoices();   // cut sustained chords/sub
  const playBtn = document.getElementById('playBtn');
  if (playBtn) { playBtn.classList.remove('playing'); const l = playBtn.querySelector('span'); if (l) l.textContent = t('play.play'); if (typeof setIcon === 'function') setIcon(playBtn, 'play'); }
  document.querySelectorAll('.step.playing').forEach(el => el.classList.remove('playing'));
}

function _prodSchedule() {
  const ctx = AudioEngine.ctx; if (!ctx) return;
  const g = GENRES[curGenre]; if (!g) return;
  const sec16 = 60 / (st.bpm || 120) / 4;        // one 16th note at the shared BPM
  while (_prodNext < ctx.currentTime + 0.12) {
    _prodPlayStep(g, _prodStep, _prodBar, _prodNext, sec16);
    _prodFlash(_prodStep, _prodNext - ctx.currentTime);
    _prodStep++;
    if (_prodStep >= 16) { _prodStep = 0; _prodBar++; }
    _prodNext += sec16;
  }
}

function _prodPlayStep(g, step, bar, when, sec16) {
  const accent = step % 4 === 0;
  g.pattern.forEach(row => { if (row.p[step] && row.snd) AudioEngine.drumHit(row.snd, when, accent); });

  const h = Array.isArray(st.history) ? st.history : [];
  const item = h.length ? h[bar % h.length] : null;
  if (!item) return;

  // Re-voice the chord once per bar (voice-led from the previous bar).
  if (step === 0) {
    const v = AudioEngine._leadVoicing(_prodPrevUpper, chordPitchesForItem(item));
    _prodVoicing = v.all; _prodPrevUpper = v.upper;
    if (g.chordStyle === 'pad') AudioEngine.playChord(_prodVoicing, (60 / (st.bpm || 120)) * 3.6, when, false);
  }
  if (g.chordStyle === 'stab' && g.chordLane && g.chordLane[step] && _prodVoicing) {
    AudioEngine.playChord(_prodVoicing, 0.22, when, false);
  }
  if (g.bassLane && g.bassLane[step]) {
    AudioEngine.subBass(chordPitchesForItem(item)[0], when, sec16 * 1.9);
  }
}

function _prodFlash(step, delay) {
  setTimeout(() => {
    if (!playing) return;
    const g = GENRES[curGenre]; if (!g) return;
    document.querySelectorAll('.step.playing').forEach(el => el.classList.remove('playing'));
    g.pattern.forEach((r, ri) => { if (r.p[step]) document.getElementById(`s-${ri}-${step}`)?.classList.add('playing'); });
  }, Math.max(0, delay * 1000));
}
