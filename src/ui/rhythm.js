// ── RHYTHM TRACK (V2 · fase B3) ───────────────────────
// Production stops being a tab and becomes a TRACK of the document.
//
// The engine already treated this as one song: _prodPlayStep schedules drums,
// voice-led chords and a sub-bass off a single clock at st.bpm. Only the
// interface insisted they were two apps, with two Play buttons and two tempos.
//
// Turning the track on makes the ONE transport play the whole thing.
const Rhythm = (() => {
  const es = () => st.lang === 'es';
  const L  = (en, e) => (es() ? e : en);

  function isOn() { return !!st.rhythmOn; }
  function toggle() {
    st.rhythmOn = !st.rhythmOn;
    saveState();
    tel('rhythm_toggle', { on: st.rhythmOn, genre: curGenre });
    if (!st.rhythmOn && typeof playing !== 'undefined' && playing) stopPlay();
    render();
  }

  function setGenre(id) { setGenre_(id); }
  function setGenre_(id) {
    if (typeof window.setGenre === 'function') window.setGenre(id);
    render();
  }

  function render() {
    const el = document.getElementById('rhythmTrack'); if (!el) return;
    const on = isOn();
    const g = GENRES[curGenre];
    el.classList.toggle('is-on', on);
    const pat = on ? _genrePattern(curGenre) : [];
    el.innerHTML = `
      <div class="rt-head">
        <button class="rt-toggle${on ? ' on' : ''}" data-act="rhythm.toggle"
          aria-pressed="${on}">${on ? '■' : '▶'}</button>
        <span class="rt-name">${L('Rhythm', 'Ritmo')}</span>
        ${on ? `<div class="rt-genres">
          ${Object.keys(GENRES).map(k => `<button class="rt-g${k === curGenre ? ' on' : ''}"
            data-act="rhythm.genre" data-id="${k}">${GENRES[k].title}</button>`).join('')}
        </div>` : `<span class="rt-hint">${L('Add drums to your progression', 'Añade batería a tu progresión')}</span>`}
      </div>
      ${on ? `<div class="rt-grid">
        ${pat.map((r, ri) => `<div class="rt-row">
          <span class="rt-lbl">${PL(r.label)}</span>
          ${r.p.map((v, i) => `<span class="rt-c${v ? ' on ' + r.cl : ''}${i % 4 === 0 ? ' b1' : ''}"
            id="s-${ri}-${i}" role="button" data-act="grid.toggle" data-ri="${ri}" data-i="${i}"></span>`).join('')}
        </div>`).join('')}
      </div>` : ''}`;
  }

  return { render, toggle, isOn, setGenre };
})();
