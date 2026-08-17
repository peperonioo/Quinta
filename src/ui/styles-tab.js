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
  // Each genre wears a colour — the header swatch and the tab's temperature.
  const GENRE_HUES = { house: '#ff5a3c', neosoul: '#b98cff', jazz: '#5ba8e5' };

  // "Cargar en Crear": parse the display names of a typical progression into
  // history items. Extensions we don't voice (13ths) map to the closest voiced
  // variant AND the label follows — the clip must not claim what the audio
  // doesn't play.
  const QUAL = [
    [/^maj7/, 'Maj', 'maj7'], [/^maj9/, 'Maj', '9'], [/^m7b5/, 'Dim', 'm7b5'],
    [/^m9/, 'Min', 'm9'], [/^m7/, 'Min', 'm7'], [/^m6/, 'Min', 'm6'], [/^m/, 'Min', 'triad'],
    [/^13/, 'Maj', '9'], [/^9/, 'Maj', '9'], [/^7/, 'Maj', '7'], [/^6/, 'Maj', '6'],
    [/^dim|^°/, 'Dim', 'triad'], [/^$/, 'Maj', 'triad'],
  ];
  function _parse(name) {
    const m = /^([A-G][b#]?)(.*)$/.exec(name); if (!m) return null;
    const [, root, rest] = m;
    for (const [re, quality, variant] of QUAL) {
      if (re.test(rest)) {
        const suf = (CHORD_VARIANTS[quality] || []).find(v => v.id === variant)?.suf ?? rest;
        return { note: root, chord: root + suf, quality, variant: variant === 'triad' ? null : variant };
      }
    }
    return null;
  }
  function useProg(gi) {
    const g = GENRES[curGenre]; const pr = g && g.progressions[gi]; if (!pr) return;
    const items = pr.chords.map(_parse).filter(Boolean);
    if (!items.length) return;
    if ((st.history || []).length &&
        !confirm(L('Replace your current progression?', '¿Sustituir tu progresión actual?'))) return;
    HistoryEngine.clear();
    items.forEach(it => HistoryEngine.addCustom(it));
    tel('styles_useprog', { genre: curGenre, idx: gi });
    switchTab('build');
  }

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
      <div class="prod-header hero" style="--ghue:${GENRE_HUES[curGenre] || 'var(--accent)'}">
        <span class="ph-swatch" aria-hidden="true"></span>
        <div>
          <div class="prod-title xl">${g.title}</div>
          <div class="prod-meta">${PL(g.sub)}</div>
        </div>
        <button class="bpm-suggest big" data-act="styles.bpm"
          title="${L(`Use the suggested ${g.title} tempo`, `Usar el tempo sugerido de ${g.title}`)}"><b>${g.bpm}</b><small>BPM</small></button>
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
          ${g.progressions.map((pr, gi) => `<button class="prog-item tappable" data-act="styles.prog" data-idx="${gi}"
            title="${L('Load into Build', 'Cargar en Crear')}">
            <div class="prog-chords">${pr.chords.map(c => `<span class="prog-chord">${c}</span>`).join('')}
              <span class="prog-go">${L('→ Build', '→ Crear')}</span></div>
            <div class="prog-desc">${PL(pr.desc)}</div>
          </button>`).join('')}
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

  return { render, pick, useBpm, useProg };
})();
