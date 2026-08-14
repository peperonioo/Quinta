// ── STYLES TAB (V6.33) ────────────────────────────────
// "Recuperar en otro tab lo que caracteriza cada género — ¿está perdido eso?"
// It never was: the GENRES data (cards, elements, typical progressions, groove
// rules, arrangement tips) survived B3 in theory-data.js — only the renderer
// died with the Produce tab. This brings it back as what it always really was:
// a READING surface. What characterises house, neo-soul, jazz.
//
// What deliberately does NOT come back: the second Play, the second tempo and
// the drum grid. Making the rhythm is Build's job (the rhythm track); this tab
// is where you learn what to make. Choosing a genre here selects the same
// st.genre the rhythm track uses — one choice, shared.
const StylesTab = (() => {
  const es = () => st.lang === 'es';
  const L  = (en, e) => (es() ? e : en);

  function pick(id) {
    if (!GENRES[id]) return;
    if (typeof setGenre === 'function') setGenre(id);   // shared with the rhythm track
    tel('styles_genre', { genre: id });
    render();
  }

  function _el(e) {
    let icon = e.icon;
    if (e.anim === 'stab') icon = `<div class="stab-icon"><div class="sk"></div><div class="sk bk"></div><div class="sk"></div><div class="sk bk"></div><div class="sk"></div></div>`;
    else if (e.anim === 'bass') icon = `<div class="bass-icon"><div class="bb"></div><div class="bb"></div><div class="bb"></div><div class="bb"></div><div class="bb"></div></div>`;
    const gear = e.gear ? `<span class="el-gear">${e.gear}</span>` : '';
    return `<div class="element-item"><div class="element-icon">${icon}</div><div class="el-body"><div class="el-name">${PL(e.name)}${gear}</div><div class="el-desc">${PL(e.desc)}</div></div></div>`;
  }

  function render() {
    const root = document.getElementById('panel-styles'); if (!root) return;
    const g = GENRES[curGenre]; if (!g) return;
    root.innerHTML = `
      <div class="genre-tabs" role="group" aria-label="${L('Genre', 'Género')}">
        ${Object.keys(GENRES).map(k => `<button class="genre-btn${k === curGenre ? ' active' : ''}"
          data-act="styles.genre" data-id="${k}">${GENRES[k].title}</button>`).join('')}
      </div>
      <div class="prod-header">
        <div>
          <div class="prod-title">${g.title}</div>
          <div class="prod-meta">${g.bpm} BPM · ${PL(g.sub)}</div>
        </div>
        <button class="bpm-suggest" data-act="styles.bpm"
          title="${L(`Use the suggested ${g.title} tempo (${g.bpm} BPM)`, `Usar el tempo sugerido de ${g.title} (${g.bpm} BPM)`)}">≈ ${g.bpm} BPM</button>
      </div>
      <div class="prod-grid">
        ${g.cards.map(c => `<div class="prod-card"><h3>${PL(c.h)}</h3><div class="bigline">${PL(c.b)}</div><p>${PL(c.p)}</p></div>`).join('')}
      </div>
      <div class="elements-section">
        <div class="elements-card"><h3>${t('production.instruments')}</h3>${g.elements.slice(0, 3).map(_el).join('')}</div>
        <div class="elements-card"><h3>${t('production.more')}</h3>${g.elements.slice(3).map(_el).join('')}</div>
      </div>
      <div class="prog-section">
        <h3>${t('production.progressions')}</h3>
        <div class="prog-list">
          ${g.progressions.map(pr => `<div class="prog-item">
            <div class="prog-chords">${pr.chords.map(c => `<span class="prog-chord">${c}</span>`).join('')}</div>
            <div class="prog-desc">${PL(pr.desc)}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="groove-section">
        <h3>${t('production.groove')}</h3>
        <div class="groove-rules">
          ${g.groove.map((r, i) => `<div class="groove-rule">
            <div class="rule-num">${String(i + 1).padStart(2, '0')}</div>
            <div class="rule-text">${PL(r)}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="tips-grid">
        ${(g.tips || []).map(sec => `<div class="tips-card"><h4>${PL(sec.h)}</h4><ul>${sec.items.map(i => `<li>${PL(i)}</li>`).join('')}</ul></div>`).join('')}
      </div>`;
  }

  // The one ACTION on the page: adopt the genre's tempo. Everything else reads.
  function useBpm() {
    const g = GENRES[curGenre]; if (!g) return;
    st.bpm = g.bpm; saveState();
    if (typeof Metronome === 'object') Metronome.render();
    if (typeof TransportSheet === 'object') TransportSheet.sync();
    haptic('ok');
    render();
  }

  return { render, pick, useBpm };
})();
