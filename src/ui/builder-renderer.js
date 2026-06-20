// ── BUILDER RENDERER ──────────────────────────────────
// Renders progression builder pills and meta.

let _playheadBeat = 0, _metroStartedByPlay = false;

// Convert a beat position to pixels within #flowRow.
function _beatToPx(beat) {
  const root = document.getElementById('flowRow');
  if (!root) return 0;
  const h = Array.isArray(st.history) ? st.history : [];
  if (!h.length) return 0;
  const bars = [...root.querySelectorAll('.builder-step')];
  if (!bars.length) return 0;
  let acc = 0;
  const starts = h.map(it => { const s = acc; acc += Math.max(1, it.beats || 2); return s; });
  let cur = 0;
  for (let k = 0; k < starts.length; k++) if (beat >= starts[k]) cur = k;
  const bar = bars[cur]; if (!bar) return 0;
  const frac = Math.min(1, Math.max(0, (beat - starts[cur]) / Math.max(1, h[cur].beats || 2)));
  return bar.offsetLeft + frac * bar.offsetWidth;
}

function _updatePlayheadPos() {
  const ph = document.getElementById('builderPlayhead');
  if (ph) ph.style.transform = `translateX(${_beatToPx(_playheadBeat)}px)`;
}

// Drag the playhead needle to choose a start position.
const PlayheadDrag = {
  start(e) {
    e.stopPropagation();
    if (_progRAF) return;                          // no drag during playback
    const root = document.getElementById('flowRow');
    if (!root) return;
    const h = Array.isArray(st.history) ? st.history : [];
    if (!h.length) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    const bars = [...root.querySelectorAll('.builder-step')];
    let acc = 0;
    const starts = h.map(it => { const s = acc; acc += Math.max(1, it.beats || 2); return s; });
    const totalBeats = acc;
    const move = ev => {
      const rowRect = root.getBoundingClientRect();
      const relX = ev.clientX - rowRect.left + root.scrollLeft;
      let beat = 0;
      for (let k = 0; k < bars.length; k++) {
        const bL = bars[k].offsetLeft, bR = bL + bars[k].offsetWidth;
        if (relX < bL) { beat = starts[k]; break; }
        if (relX <= bR) { beat = starts[k] + (relX - bL) / bars[k].offsetWidth * Math.max(1, h[k].beats || 2); break; }
        if (k === bars.length - 1) beat = totalBeats;
      }
      _playheadBeat = Math.max(0, Math.min(totalBeats - 0.01, beat));
      const ph = document.getElementById('builderPlayhead');
      if (ph) ph.style.transform = `translateX(${_beatToPx(_playheadBeat)}px)`;
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  },
};

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
  const lbl = x => (typeof chordDisplay === 'function') ? chordDisplay(x) : x.chord;
  const unique = new Set(h.map(x => `${x.key}|${x.mode}|${x.degreeIndex}|${x.variant || ''}`));
  if (h.length > 2 && unique.size === 1) return `Loop / Pedal — ${lbl(h[0])} × ${h.length}`;
  return h.map(lbl).join(' → ');
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
      variant:     opts.variant || null,   // chord extension: '7','maj7','sus4'…
      uid:         Date.now() + '-' + Math.random().toString(36).slice(2),
      __justAdded: true,
    };
    if (!Array.isArray(st.history)) st.history = [];
    if (Number.isInteger(opts.at) && opts.at >= 0 && opts.at <= st.history.length) {
      st.history.splice(opts.at, 0, item);          // drop at a position (Klimper)
    } else {
      st.history.push(item);
    }
    if (st.history.length > this.max) st.history = st.history.slice(-this.max);
    this.render();
    renderProgressionStory();
    saveState();
    if (opts.sourceEl) animateChordToBuilder(opts.sourceEl, idx);
  },

  remove(index) {
    if (!Array.isArray(st.history) || !st.history[index]) return;
    const uid = st.history[index].uid;
    const btn = document.querySelector(`[data-uid="${uid}"]`);
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      const i = st.history.findIndex(x => x.uid === uid);   // re-find in case order shifted
      if (i >= 0) st.history.splice(i, 1);
      this.render();
      renderProgressionStory();
      saveState();
    };
    if (btn) {
      btn.classList.add('just-removed');
      btn.addEventListener('animationend', finish, { once: true });
      setTimeout(finish, 280);   // fallback: reduced-motion / backgrounded tab won't fire animationend
    } else {
      finish();
    }
  },

  clear() {
    _playheadBeat = 0;
    st.history = [];
    this.render();
    renderProgressionStory();
    saveState();
  },

  render() {
    const root = document.getElementById('flowRow'); if (!root) return;
    const h    = Array.isArray(st.history) ? st.history : [];

    // Once you're building, the giant wheel steps back (it shrinks on mobile so the
    // builder gets the screen). Empty progression → the wheel is the protagonist.
    document.body.classList.toggle('building', h.length > 0);

    // Clear __justAdded flag + migrate older items that have no duration yet.
    h.forEach(it => { delete it.__justAdded; if (it.beats == null) it.beats = 2; });

    if (!h.length) {
      root.classList.remove('is-timeline');
      root.innerHTML = `<div class="builder-empty">${t('builder.empty')}</div>`;
      BuilderEngine.meta();
      if (typeof GuitarShapes === 'object') GuitarShapes.onProgressionChange();
      return;
    }

    // DAW-style timeline: each chord is a bar whose width = its duration.
    root.classList.add('is-timeline');
    root.innerHTML = h.map((it, i) => `
      <div data-uid="${it.uid || i}" data-i="${i}" class="builder-step" style="--beats:${it.beats}"
        role="button" tabindex="0"
        aria-label="${chordLabel(it)}, ${casedRoman(it.degree, it.quality)}, ${it.beats} beats. Enter for chord settings, Delete to remove."
        onpointerdown="BarDrag.start(event,${i})" onkeydown="BarDrag.key(event,${i})">
        <span class="step-num" aria-hidden="true">${i + 1}</span>
        <span class="step-chord">${chordLabel(it)}</span>
        <span class="step-sub"><span class="step-degree">${casedRoman(it.degree, it.quality)}</span><span class="step-len">${fmtBeats(it.beats)}</span></span>
        <span class="step-resize" title="Drag to set duration" onpointerdown="DurationDrag.start(event,${i})"></span>
      </div>`).join('') + `<div class="builder-playhead" id="builderPlayhead" onpointerdown="PlayheadDrag.start(event)"></div>`;

    // Re-rendering closes any open per-chord chooser.
    if (typeof ChordVariants === 'object') ChordVariants.close();

    // Animate only the last added bar
    const lastEl = root.querySelector('.builder-step:last-of-type');
    if (lastEl) { lastEl.classList.add('just-added'); setTimeout(() => lastEl.classList.remove('just-added'), 600); }

    BuilderEngine.meta();
    if (typeof GuitarShapes === 'object') GuitarShapes.onProgressionChange();
    requestAnimationFrame(_updatePlayheadPos);
  },
};

// The chord name shown on a bar, including its variant suffix (Cmaj7, G7, Dsus4…).
function chordLabel(it) {
  return (typeof chordDisplay === 'function') ? chordDisplay(it) : it.chord;
}

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
      if (nb !== lastBeats) { lastBeats = nb; if (typeof AudioEngine === 'object') AudioEngine.tick(240, 0.08); }
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
    // The chord list + count is redundant with the pills above. Only surface the
    // special "Loop / Pedal" reading — that's an insight, not a restatement.
    const narrative = h.length ? progressionNarrative() : '';
    el.innerHTML = /^Loop/.test(narrative) ? `<b>${narrative}</b>` : '';
  },

  // Swap a bar with its neighbour (used by tests + programmatic reorder).
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
};

// ── Bar drag-to-reorder + tap (V4.5) ──────────────────
// Drag a timeline bar sideways to reorder it freely; a tap (no drag) plays the
// chord and opens its variant/settings chooser.
const BarDrag = {
  start(e, i) {
    if (e.target.closest('.step-resize')) return;          // resize is its own gesture
    const bar = e.currentTarget;
    const row = document.getElementById('flowRow');
    const startX = e.clientX;
    let dragging = false, targetIndex = i;
    try { bar.setPointerCapture(e.pointerId); } catch (_) {}

    const move = ev => {
      const dx = ev.clientX - startX;
      if (!dragging && Math.abs(dx) > 6) { dragging = true; bar.classList.add('dragging'); }
      if (!dragging) return;
      ev.preventDefault();
      bar.style.transform = `translateX(${dx}px) translateY(-3px) scale(1.04)`;
      bar.style.zIndex = '5';
      // Which slot is the bar's centre over?
      const cx = bar.getBoundingClientRect().left + bar.offsetWidth / 2;
      const others = [...row.querySelectorAll('.builder-step')].filter(b => b !== bar);
      targetIndex = 0;
      others.forEach(b => { const r = b.getBoundingClientRect(); if (cx > r.left + r.width / 2) targetIndex++; });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      bar.classList.remove('dragging'); bar.style.transform = ''; bar.style.zIndex = '';
      if (dragging) {
        const h = st.history;
        if (Array.isArray(h) && targetIndex !== i && targetIndex >= 0 && targetIndex < h.length) {
          const [moved] = h.splice(i, 1);
          h.splice(targetIndex, 0, moved);
          HistoryEngine.render(); renderProgressionStory(); saveState();
        }
      } else {
        // Tap → sound the chord + open its chooser.
        const it = (st.history || [])[i];
        if (it && typeof AudioEngine === 'object') AudioEngine.playChord(chordPitchesForItem(it));
        if (typeof ChordVariants === 'object') ChordVariants.openForBar(i);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  },

  // Keyboard access for a bar: Enter/Space opens the chooser, Delete removes.
  key(e, i) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const it = (st.history || [])[i];
      if (it && typeof AudioEngine === 'object') AudioEngine.playChord(chordPitchesForItem(it));
      if (typeof ChordVariants === 'object') ChordVariants.openForBar(i);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      HistoryEngine.remove(i);
    }
  },
};

// ── Progression playback (V4.2) ───────────────────────
// DAW-style: each chord rings for its own duration, a playhead sweeps the
// timeline in tempo, and the bar under the playhead lights up.
let _progRAF = 0;
function setProgBtn(playing) {
  // The floating mobile transport mirrors the builder's Play/Stop state.
  const fb = document.getElementById('floatPlay');
  if (fb) { if (typeof setIcon === 'function') setIcon(fb, playing ? 'stop' : 'play'); fb.classList.toggle('is-stop', playing); }
  const b = document.getElementById('playProgBtn'); if (!b) return;
  const lbl = b.querySelector('span'); if (lbl) lbl.textContent = playing ? t('play.stop') : t('builder.play');
  if (typeof setIcon === 'function') setIcon(b, playing ? 'stop' : 'play');
  b.classList.toggle('is-stop', playing);
  b.classList.toggle('playing', playing);
}
function stopProgression() {
  cancelAnimationFrame(_progRAF); _progRAF = 0;
  if (typeof AudioEngine === 'object') AudioEngine.killVoices();
  document.querySelectorAll('.builder-step.playing').forEach(p => p.classList.remove('playing'));
  const ph = document.getElementById('builderPlayhead'); if (ph) ph.classList.remove('on');
  setProgBtn(false);
  if (_metroStartedByPlay) { Metronome.stop(); _metroStartedByPlay = false; }
}
// The ▶/■ button toggles between starting and stopping playback.
function toggleProgPlay() {
  if (_progRAF) stopProgression();
  else playProgression();
}

// Playback option toggles (7th chords, count-in). Persisted in state.
function togglePlayOpt(key, el) {
  st[key] = !st[key]; saveState();
  if (el) { el.classList.toggle('active', !!st[key]); el.setAttribute('aria-pressed', !!st[key]); }
  // Preview the 7ths change on the currently selected chord.
  if (key === 'sevenths' && curDeg >= 0 && typeof AudioEngine === 'object')
    AudioEngine.playChord(chordPitchesForDegree(curDeg));
}

// Reflect persisted option state on the toggle buttons at boot.
function initPlayOpts() {
  const c = document.getElementById('countInBtn'); if (c) { c.classList.toggle('active', !!st.countIn); c.setAttribute('aria-pressed', !!st.countIn); }
  const v = document.getElementById('voicingBtn'); if (v) { v.classList.toggle('active', !!st.voicingOpen); v.setAttribute('aria-pressed', !!st.voicingOpen); }
}

function playProgression() {
  if (typeof AudioEngine !== 'object') return;
  const h = Array.isArray(st.history) ? st.history : [];
  cancelAnimationFrame(_progRAF); _progRAF = 0;
  document.querySelectorAll('.builder-step.playing').forEach(p => p.classList.remove('playing'));

  if (!h.length) { AudioEngine.playChord(chordPitchesForDegree(curDeg >= 0 ? curDeg : 0)); return; }

  const secPerBeat = 60 / (st.bpm || 100);
  const allEntries = h.map(it => ({ pitches: chordPitchesForItem(it), beats: Math.max(1, it.beats || 2) }));

  // Cumulative beat starts across all entries.
  let bAcc = 0;
  const starts = allEntries.map(e => { const s = bAcc; bAcc += e.beats; return s; });
  const totalBeats = bAcc;

  // Clamp playhead — if at/near the end, wrap to 0.
  const startBeat = _playheadBeat >= totalBeats - 0.25 ? 0 : Math.max(0, _playheadBeat);
  let startIdx = 0;
  for (let k = 0; k < starts.length; k++) if (startBeat >= starts[k]) startIdx = k; else break;
  const withinBeat = startBeat - starts[startIdx];

  // Slice audio entries from the start position (first entry may be shorter).
  const entries = allEntries.slice(startIdx).map((e, i) =>
    i === 0 && withinBeat > 0.05
      ? { pitches: e.pitches, beats: Math.max(0.5, e.beats - withinBeat) }
      : e
  );

  // Count-in: start the Metronome so it ticks through the whole progression.
  let leadSec = 0;
  if (st.countIn && !Metronome.playing) {
    Metronome.start();
    _metroStartedByPlay = true;
    leadSec = 4 * secPerBeat + 0.08;   // 4-beat count-in matches Metronome's internal lookahead
  }

  const { totalSec } = AudioEngine.playTimeline(entries, secPerBeat, leadSec);
  setProgBtn(true);

  const root = document.getElementById('flowRow');
  const ph   = document.getElementById('builderPlayhead');
  const bars = [...root.querySelectorAll('.builder-step')];
  if (ph) ph.classList.add('on');

  const t0 = performance.now() + leadSec * 1000;
  const frame = () => {
    const elapsed = (performance.now() - t0) / 1000;
    if (elapsed < 0) { _progRAF = requestAnimationFrame(frame); return; }  // count-in: hold
    const globalBeat = startBeat + elapsed / secPerBeat;
    let cur = 0;
    for (let k = 0; k < starts.length; k++) if (globalBeat >= starts[k]) cur = k;
    const bar = bars[cur];
    if (bar && ph) {
      const frac = Math.min(1, (globalBeat - starts[cur]) / allEntries[cur].beats);
      ph.style.transform = `translateX(${bar.offsetLeft + frac * bar.offsetWidth}px)`;
      _playheadBeat = globalBeat;
    }
    bars.forEach((b, k) => b.classList.toggle('playing', k === cur && elapsed < totalSec));
    if (elapsed < totalSec) { _progRAF = requestAnimationFrame(frame); }
    else {
      bars.forEach(b => b.classList.remove('playing'));
      if (ph) ph.classList.remove('on');
      _progRAF = 0; setProgBtn(false);
      _playheadBeat = 0;
      _updatePlayheadPos();
      if (_metroStartedByPlay) { Metronome.stop(); _metroStartedByPlay = false; }
    }
  };
  _progRAF = requestAnimationFrame(frame);
}
