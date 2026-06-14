// ── BUILDER RENDERER ──────────────────────────────────
// Renders progression builder pills and meta.

function friendlyStoryFor(item, slot, i, h) {
  if (!item) return ['—', 'Choose a chord to start'];
  const d   = String(item.degree || '');
  const map = {
    Beginning: ['Start',   'Sets the colour'],
    Lift:      ['Lift',    'Opens the phrase'],
    Conflict:  ['Tension', 'Creates a question'],
    Release:   ['Release', 'Lets it breathe'],
    Resolution:['Home',    'Land or loop'],
  };
  let [label, feel] = map[slot] || [slot, 'Keep moving'];
  if (/V|v/.test(d) && slot !== 'Resolution') feel = 'Adds pull before landing';
  if (/IV|iv/.test(d))                        feel = 'Warm lift, easy to sing over';
  if (/vi|♭VI/.test(d))                       feel = 'Emotional colour';
  if (/°/.test(d))                            feel = 'Use as passing tension';
  if (i > 0 && h[i-1] && h[i-1].degreeIndex === item.degreeIndex)
    feel = 'Repeated colour — change rhythm or voicing';
  return [label, feel];
}

function progressionNarrative() {
  const h = Array.isArray(st.history) ? st.history : [];
  if (!h.length) return t('builder.empty');
  const unique = new Set(h.map(x => `${x.key}|${x.mode}|${x.degreeIndex}`));
  if (h.length > 2 && unique.size === 1) return `Loop / Pedal — ${h[0].chord} × ${h.length}`;
  return h.map(x => x.chord).join(' → ');
}

const HistoryEngine = {
  max: 32,

  addDegree(idx, opts = {}) {
    const c    = gc()[idx];
    if (!c) return;
    const item = {
      chord:       c.chord,
      degree:      c.degree,
      quality:     c.quality,
      degreeIndex: idx,
      key:         st.key,
      mode:        st.mode,
      beats:       2,        // duration in beats — resizable on the timeline
      uid:         Date.now() + '-' + Math.random().toString(36).slice(2),
      __justAdded: true,
    };
    if (!Array.isArray(st.history)) st.history = [];
    st.history.push(item);
    if (st.history.length > this.max) st.history = st.history.slice(-this.max);
    this.render();
    renderProgressionStory();
    saveState();
    if (opts.sourceEl) animateChordToBuilder(opts.sourceEl, idx);
  },

  remove(index) {
    if (!Array.isArray(st.history)) return;
    const btn = document.querySelector(`[data-uid="${st.history[index]?.uid}"]`);
    if (btn) {
      btn.classList.add('just-removed');
      btn.addEventListener('animationend', () => {
        st.history.splice(index, 1);
        this.render();
        renderProgressionStory();
        saveState();
      }, { once: true });
    } else {
      st.history.splice(index, 1);
      this.render();
      renderProgressionStory();
      saveState();
    }
  },

  clear() {
    st.history = [];
    this.render();
    renderProgressionStory();
    saveState();
  },

  recall(index) {
    const item = st.history[index];
    if (!item) return;
    AppActions.selectDegree(item.degreeIndex, { fromHistory: true });
  },

  dragStart(e, i) { e.dataTransfer.setData('text/plain', i); },

  drop(e, target) {
    e.preventDefault();
    const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(from) || from === target) return;
    const h   = st.history;
    const tmp = h[from];
    h.splice(from, 1);
    h.splice(target, 0, tmp);
    this.render();
    renderProgressionStory();
    saveState();
  },

  render() {
    const root = document.getElementById('flowRow'); if (!root) return;
    const h    = Array.isArray(st.history) ? st.history : [];

    // Clear __justAdded flag + migrate older items that have no duration yet.
    h.forEach(it => { delete it.__justAdded; if (it.beats == null) it.beats = 2; });

    if (!h.length) {
      root.classList.remove('is-timeline');
      root.innerHTML = `<div class="builder-empty">${t('builder.empty')}</div>`;
      BuilderEngine.meta();
      return;
    }

    // DAW-style timeline: each chord is a bar whose width = its duration.
    root.classList.add('is-timeline');
    root.innerHTML = h.map((it, i) => `
      <div data-uid="${it.uid || i}" data-i="${i}" class="builder-step" style="--beats:${it.beats}"
        onclick="BuilderEngine.focusBar(${i})">
        <span class="step-num">${i + 1}</span>
        <span class="step-chord">${it.chord}</span>
        <span class="step-sub"><span class="step-degree">${it.degree}</span><span class="step-len">${fmtBeats(it.beats)}</span></span>
        <span class="step-tools">
          <span class="step-tool" title="Move left"  onclick="event.stopPropagation();BuilderEngine.move(${i},-1)">‹</span>
          <span class="step-tool" title="Hear"       onclick="event.stopPropagation();BuilderEngine.hear(${i})">♪</span>
          <span class="step-tool" title="Duplicate"  onclick="event.stopPropagation();BuilderEngine.duplicate(${i})">+</span>
          <span class="step-tool" title="Delete"     onclick="event.stopPropagation();HistoryEngine.remove(${i})">×</span>
          <span class="step-tool" title="Move right" onclick="event.stopPropagation();BuilderEngine.move(${i},1)">›</span>
        </span>
        <span class="step-resize" title="Drag to set duration" onpointerdown="DurationDrag.start(event,${i})"></span>
      </div>`).join('') + `<div class="builder-playhead" id="builderPlayhead"></div>`;

    // Animate only the last added bar
    const lastEl = root.querySelector('.builder-step:last-of-type');
    if (lastEl) { lastEl.classList.add('just-added'); setTimeout(() => lastEl.classList.remove('just-added'), 600); }

    BuilderEngine.meta();
  },
};

// "2♩", "1.5♩" — beats shown with a quarter-note glyph so the bar reads as a duration.
function fmtBeats(b) { return (Number.isInteger(b) ? b : b.toFixed(1)) + '♩'; }

// Drag the right edge of a bar to lengthen/shorten its duration (snaps to ½ beat).
const DurationDrag = {
  start(e, i) {
    e.preventDefault(); e.stopPropagation();
    const bar = e.currentTarget.closest('.builder-step');
    const item = (st.history || [])[i];
    if (!bar || !item) return;
    const pxBeat = parseFloat(getComputedStyle(bar).getPropertyValue('--px-beat')) || 48;
    const startX = e.clientX, startBeats = item.beats || 2;
    bar.classList.add('resizing');
    try { bar.setPointerCapture(e.pointerId); } catch (_) {}
    let lastBeats = startBeats;
    const move = ev => {
      const dBeats = Math.round(((ev.clientX - startX) / pxBeat) * 2) / 2;  // snap ½
      const nb = Math.max(1, Math.min(8, startBeats + dBeats));
      item.beats = nb;
      bar.style.setProperty('--beats', nb);
      const lab = bar.querySelector('.step-len'); if (lab) lab.textContent = fmtBeats(nb);
      if (nb !== lastBeats) { lastBeats = nb; if (typeof AudioEngine === 'object') AudioEngine.tick(820, 0.08); }
    };
    const up = () => {
      bar.classList.remove('resizing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      saveState(); BuilderEngine.meta();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  },
};

const BuilderEngine = {
  meta() {
    const el = document.getElementById('builderMeta'); if (!el) return;
    const h  = Array.isArray(st.history) ? st.history : [];
    if (!h.length) { el.innerHTML = ''; return; }
    const unique = new Set(h.map(x => x.degreeIndex));
    el.innerHTML = `<span>${h.length} chord${h.length > 1 ? 's' : ''}</span>
      <b>${progressionNarrative()}</b>`;
  },

  addCurrent() {
    if (curDeg < 0) return;
    AppActions.selectDegree(curDeg, { force: true });
  },

  // Tap a bar → reveal its inline toolbar (works on touch where there's no
  // hover). Tapping the same bar again hides it; tapping another moves focus.
  // We deliberately don't re-render here, so the revealed toolbar survives.
  focusBar(index) {
    const bars = document.querySelectorAll('#flowRow .builder-step');
    bars.forEach(b => {
      const me = +b.dataset.i === index;
      b.classList.toggle('show-tools', me && !b.classList.contains('show-tools'));
      if (!me) b.classList.remove('show-tools');
    });
  },

  // Hear a single bar's chord and select it on the wheel.
  hear(index) {
    const it = (st.history || [])[index];
    if (it && typeof AudioEngine === 'object') AudioEngine.playChord(chordPitchesForItem(it));
    HistoryEngine.recall(index);
  },

  duplicateLast() {
    const h = st.history;
    if (!Array.isArray(h) || !h.length) return;
    HistoryEngine.addDegree(h[h.length - 1].degreeIndex);
  },

  duplicate(index) {
    const h = st.history;
    if (!h?.[index]) return;
    setTimeout(() => HistoryEngine.addDegree(h[index].degreeIndex, { force: true }), 0);
  },

  move(index, dir) {
    const h = st.history;
    if (!Array.isArray(h)) return;
    const target = index + dir;
    if (target < 0 || target >= h.length) return;
    const tmp   = h[index];
    h[index]    = h[target];
    h[target]   = tmp;
    HistoryEngine.render();
    renderProgressionStory();
    saveState();
  },

  copy() {
    const text = progressionNarrative();
    navigator.clipboard?.writeText(text).then(() => {
      const toast = document.getElementById('copyToast');
      if (toast) {
        toast.textContent = 'Copied: ' + text;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      }
    }).catch(() => {});
  },
};

// ── Progression playback (V4.2) ───────────────────────
// DAW-style: each chord rings for its own duration, a playhead sweeps the
// timeline in tempo, and the bar under the playhead lights up.
let _progRAF = 0;
function setProgBtn(playing) {
  const b = document.getElementById('playProgBtn'); if (!b) return;
  b.textContent = playing ? t('play.stop') : t('builder.play');
  b.classList.toggle('is-stop', playing);
}
function stopProgression() {
  cancelAnimationFrame(_progRAF); _progRAF = 0;
  if (typeof AudioEngine === 'object') AudioEngine.stop();
  document.querySelectorAll('.builder-step.playing').forEach(p => p.classList.remove('playing'));
  const ph = document.getElementById('builderPlayhead'); if (ph) ph.classList.remove('on');
  setProgBtn(false);
}
// The ▶/■ button toggles between starting and stopping playback.
function toggleProgPlay() {
  if (_progRAF) stopProgression();
  else playProgression();
}

// Playback option toggles (7th chords, count-in). Persisted in state.
function togglePlayOpt(key, el) {
  st[key] = !st[key]; saveState();
  if (el) el.classList.toggle('active', !!st[key]);
  // Preview the 7ths change on the currently selected chord.
  if (key === 'sevenths' && curDeg >= 0 && typeof AudioEngine === 'object')
    AudioEngine.playChord(chordPitchesForDegree(curDeg));
}

// Reflect persisted option state on the toggle buttons at boot.
function initPlayOpts() {
  const s = document.getElementById('seventhsBtn'); if (s) s.classList.toggle('active', !!st.sevenths);
  const c = document.getElementById('countInBtn');  if (c) c.classList.toggle('active', !!st.countIn);
}

function playProgression() {
  if (typeof AudioEngine !== 'object') return;
  const h = Array.isArray(st.history) ? st.history : [];
  cancelAnimationFrame(_progRAF); _progRAF = 0;
  document.querySelectorAll('.builder-step.playing').forEach(p => p.classList.remove('playing'));

  // Nothing built yet → just sound the currently selected chord.
  if (!h.length) { AudioEngine.playChord(chordPitchesForDegree(curDeg >= 0 ? curDeg : 0)); return; }

  const secPerBeat = 60 / (st.bpm || 100);                  // synced to the metronome BPM
  const entries = h.map(it => ({ pitches: chordPitchesForItem(it), beats: Math.max(1, it.beats || 2) }));
  const leadSec = st.countIn ? AudioEngine.countIn(secPerBeat) : 0;   // optional 1-bar count-in
  const { totalSec } = AudioEngine.playTimeline(entries, secPerBeat, leadSec);
  setProgBtn(true);

  const root  = document.getElementById('flowRow');
  const ph    = document.getElementById('builderPlayhead');
  const bars  = [...root.querySelectorAll('.builder-step')];
  let acc = 0; const starts = entries.map(e => { const s = acc; acc += e.beats; return s; });

  if (ph) ph.classList.add('on');
  const t0 = performance.now() + leadSec * 1000;       // wait out the count-in before sweeping
  const frame = () => {
    const elapsed = (performance.now() - t0) / 1000;
    if (elapsed < 0) { _progRAF = requestAnimationFrame(frame); return; }   // count-in: hold at start
    const beatPos = elapsed / secPerBeat;
    let cur = 0; for (let k = 0; k < starts.length; k++) if (beatPos >= starts[k]) cur = k;
    const bar = bars[cur];
    if (bar && ph) {
      const frac = Math.min(1, (beatPos - starts[cur]) / entries[cur].beats);
      ph.style.transform = `translateX(${bar.offsetLeft + frac * bar.offsetWidth}px)`;
    }
    bars.forEach((b, k) => b.classList.toggle('playing', k === cur && elapsed < totalSec));
    if (elapsed < totalSec) { _progRAF = requestAnimationFrame(frame); }
    else { bars.forEach(b => b.classList.remove('playing')); if (ph) ph.classList.remove('on'); _progRAF = 0; setProgBtn(false); }
  };
  _progRAF = requestAnimationFrame(frame);
}
