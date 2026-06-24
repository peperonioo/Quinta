// ── BUILDER RENDERER ──────────────────────────────────
// Renders progression builder pills and meta.

let _playheadBeat = 0, _metroStartedByPlay = false;

const GRID_MIN = 8;     // always show at least 2 bars of grid to drop clips into
// Drag snap, in beats. Cycled by the snap button on the ruler.
const SNAP_STEPS = [{ label: '1/4', v: 1 }, { label: '1/8', v: 0.5 }, { label: '1/16', v: 0.25 }, { label: 'free', v: 0 }];
function _snapVal() { return (typeof st.snap === 'number') ? st.snap : 0.25; }
function _snapTo(x) { const s = _snapVal(); return s > 0 ? Math.round(x / s) * s : x; }
function _snapLabel() { return (SNAP_STEPS.find(s => s.v === _snapVal()) || SNAP_STEPS[2]).label; }
function cycleSnap() {
  const i = SNAP_STEPS.findIndex(s => s.v === _snapVal());
  const next = SNAP_STEPS[(i + 1) % SNAP_STEPS.length] || SNAP_STEPS[2];
  st.snap = next.v; saveState();
  const b = document.getElementById('snapBtn'); if (b) b.textContent = next.label;
}

// Build the bar/beat ruler above the grid (bar numbers + beat ticks), aligned to
// the same px-beat as the clips, and keep it scroll-synced with the grid.
function _renderRuler(gridBeats) {
  const ruler = document.getElementById('builderRuler');
  const marks = document.getElementById('rulerMarks');
  const snapB = document.getElementById('snapBtn');
  if (!ruler || !marks) return;
  ruler.hidden = false;
  if (snapB) snapB.textContent = _snapLabel();
  const pxBeat = _pxBeat();
  const bars = Math.ceil(gridBeats / 4);
  let html = '';
  for (let b = 0; b < bars; b++) {
    html += `<span class="rk-bar" style="left:${b * 4 * pxBeat}px">${b + 1}</span>`;
    for (let bt = 1; bt < 4; bt++) html += `<span class="rk-beat" style="left:${(b * 4 + bt) * pxBeat}px"></span>`;
  }
  marks.style.width = (gridBeats * pxBeat) + 'px';
  marks.innerHTML = html;
  const fr = document.getElementById('flowRow');
  if (fr) {
    marks.style.transform = `translateX(${-fr.scrollLeft}px)`;
    if (!fr._rulerSync) {       // sync the ruler to horizontal grid scroll (once)
      fr._rulerSync = true;
      fr.addEventListener('scroll', () => {
        const m = document.getElementById('rulerMarks');
        if (m) m.style.transform = `translateX(${-fr.scrollLeft}px)`;
      }, { passive: true });
    }
  }
}

// Scroll-driven focus: once you scroll down to the progression builder (the wheel
// has gone off the top), it expands to fill the screen so the section you're in is
// the protagonist. Hysteresis (enter at 34% of the viewport, leave at 56%) avoids
// flicker at the boundary. Only kicks in when you're actually building.
function initBuilderFocus() {
  const el = document.getElementById('progressionBuilder'); if (!el || el._focusWired) return;
  el._focusWired = true;
  // Cheap enough to run straight on scroll (one getBoundingClientRect + a class
  // toggle) — no rAF, which can be throttled and miss updates.
  const apply = () => {
    const body = document.body;
    if (!body.classList.contains('building')) { body.classList.remove('focus-builder'); return; }
    const top = el.getBoundingClientRect().top, vh = innerHeight || 1;
    const on = body.classList.contains('focus-builder');
    if (!on && top < vh * 0.34) body.classList.add('focus-builder');
    else if (on && top > vh * 0.56) body.classList.remove('focus-builder');
  };
  addEventListener('scroll', apply, { passive: true });
  addEventListener('resize', apply, { passive: true });
  try { new IntersectionObserver(apply, { threshold: [0, 0.25, 0.5, 0.75, 1] }).observe(el); } catch (_) {}
  apply();
}

// Horizontal pixels per beat (set in CSS on the timeline row).
function _pxBeat() {
  const root = document.getElementById('flowRow');
  const v = root && parseFloat(getComputedStyle(root).getPropertyValue('--px-beat'));
  return v || 48;
}

// Absolute timeline: each chord has `start` (beats from the section start) and a
// duration `beats`. Clips can sit anywhere on the grid — including off the beat and
// overlapping — which is what free-drag placement needs. Legacy items (ordered, or
// carrying the old `lead`) are migrated to an absolute `start` once.
function _layout(h) {
  // Where the timeline currently ends (from clips that already have a start).
  let end = 0;
  h.forEach(it => { if (typeof it.start === 'number') end = Math.max(end, it.start + Math.max(0.25, it.beats || 2)); });
  // Assign a start to any item without one: new chords land after the last clip;
  // a legacy `lead` (V5.60) is honoured so off-beat placements survive the upgrade.
  h.forEach(it => {
    if (typeof it.start !== 'number') {
      it.start = Math.max(0, end + (it.lead || 0));
      end = it.start + Math.max(0.25, it.beats || 2);
    }
  });
  let total = 0;
  h.forEach(it => { total = Math.max(total, (it.start || 0) + Math.max(0.25, it.beats || 2)); });
  return { starts: h.map(it => it.start || 0), total };
}

// Beat → pixels is a straight multiply now that clips are absolutely positioned.
function _beatToPx(beat) { return beat * _pxBeat(); }

// While dragging a clip, push the clips it overlaps out of the way — in the drag
// direction — and let that cascade, so clips behave like solid objects ("physics").
// Mutates `pos` (a copy of the starts array); `di` is the dragged clip's index.
function _pushCollisions(pos, h, di, dir) {
  const len = k => Math.max(0.25, h[k].beats || 2);
  const others = h.map((_, k) => k).filter(k => k !== di);
  if (dir >= 0) {                                        // dragging right → shove right
    let frontier = pos[di] + len(di);
    others.sort((a, b) => pos[a] - pos[b]).forEach(k => {
      if (pos[k] < frontier && pos[k] + len(k) > pos[di]) { pos[k] = frontier; frontier = pos[k] + len(k); }
    });
  } else {                                               // dragging left → shove left; the start (0) is a hard wall
    let frontier = pos[di];
    const moved = [];
    others.sort((a, b) => pos[b] - pos[a]).forEach(k => {
      if (pos[k] + len(k) > frontier && pos[k] < pos[di] + len(di)) { pos[k] = frontier - len(k); moved.push(k); frontier = pos[k]; }
    });
    // No room left before the start → push the dragged clip (and the shoved chain)
    // back by the overflow so clips hit a wall instead of piling up on top of each other.
    if (moved.length) {
      const overflow = -Math.min(...moved.map(k => pos[k]));
      if (overflow > 0) { pos[di] += overflow; moved.forEach(k => pos[k] += overflow); }
    }
  }
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
    const { total: totalBeats } = _layout(h);
    const pxBeat = _pxBeat();
    const move = ev => {
      const rowRect = root.getBoundingClientRect();
      const relX = ev.clientX - rowRect.left + root.scrollLeft;
      _playheadBeat = Math.max(0, Math.min(totalBeats - 0.01, relX / pxBeat));   // absolute position
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
    if (typeof tel === 'function') tel('chord_add');
    if (opts.sourceEl) animateChordToBuilder(opts.sourceEl, idx);
  },

  // Append a non-diatonic / borrowed "colour" chord (no degree index — its root
  // and quality/variant fully describe it via chordPitchesForItem).
  addCustom(spec) {
    const item = {
      chord: spec.chord, degree: spec.degree || '', quality: spec.quality,
      degreeIndex: -1, note: spec.note, key: st.key, mode: st.mode, beats: 2,
      variant: spec.variant || null,
      uid: Date.now() + '-' + Math.random().toString(36).slice(2), __justAdded: true,
    };
    if (!Array.isArray(st.history)) st.history = [];
    st.history.push(item);
    if (st.history.length > this.max) st.history = st.history.slice(-this.max);
    this.render();
    renderProgressionStory();
    saveState();
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
    if (typeof renderInstrProgStrip === 'function') renderInstrProgStrip();
    if (typeof initBuilderFocus === 'function') initBuilderFocus();   // wire scroll-focus once (idempotent)

    // Clear __justAdded flag + migrate older items (no duration yet).
    h.forEach(it => { delete it.__justAdded; if (it.beats == null) it.beats = 2; });

    if (!h.length) {
      root.classList.remove('is-timeline');
      root.innerHTML = `<div class="builder-empty">${t('builder.empty')}</div>`;
      const ruler = document.getElementById('builderRuler'); if (ruler) ruler.hidden = true;
      BuilderEngine.meta();
      if (typeof GuitarShapes === 'object') GuitarShapes.onProgressionChange();
      return;
    }

    // DAW-style grid: each chord is a clip placed at its absolute start, width = its
    // duration. Clips can be dragged freely (and off the beat). _layout() assigns a
    // start to any legacy/new item.
    root.classList.add('is-timeline');
    const { total } = _layout(h);
    const gridBeats = Math.max(GRID_MIN, Math.ceil(total / 4) * 4);   // round up to whole bars, ≥2 bars
    root.style.setProperty('--grid-beats', gridBeats);
    _renderRuler(gridBeats);
    root.innerHTML = h.map((it, i) => `
      <div data-uid="${it.uid || i}" data-i="${i}" class="builder-step${(it.start || 0) % 1 ? ' off' : ''}" style="--beats:${it.beats};--start:${it.start || 0}"
        role="button" tabindex="0"
        aria-label="${chordLabel(it)}, ${casedRoman(it.degree, it.quality)}, ${it.beats} beats${(it.start || 0) % 1 ? ', off-beat' : ''}. Enter for chord settings, Delete to remove."
        onpointerdown="BarDrag.start(event,${i})" onkeydown="BarDrag.key(event,${i})">
        <span class="step-num" aria-hidden="true">${i + 1}</span>
        <span class="step-chord">${chordLabel(it)}</span>
        <span class="step-sub"><span class="step-degree">${casedRoman(it.degree, it.quality)}</span><span class="step-len">${fmtBeats(it.beats)}</span></span>
        <span class="step-resize" title="Drag to set duration" onpointerdown="DurationDrag.start(event,${i})"></span>
      </div>`).join('') + `<div class="builder-playhead" id="builderPlayhead" onpointerdown="PlayheadDrag.start(event)"></div><div class="builder-spacer" aria-hidden="true"></div>`;

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
      const raw = startBeats + (ev.clientX - startX) / pxBeat;
      const s = _snapVal();
      const nb = Math.max(0.25, Math.min(16, s > 0 ? Math.round(raw / s) * s : raw));  // snap per the ruler setting
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

// ── Bar free-drag + tap (V5.61) ───────────────────────
// Drag a clip sideways to place it anywhere on the grid (snaps to 1/4-beat, so it
// can land off the beat); a tap (no drag) plays the chord and opens its chooser.
const BarDrag = {
  start(e, i) {
    if (e.target.closest('.step-resize')) return;   // resize is its own gesture
    const bar = e.currentTarget;
    const h = st.history;
    const item = h && h[i];
    if (!item) return;
    const root = document.getElementById('flowRow');
    const els = h.map((_, k) => root.querySelector(`.builder-step[data-i="${k}"]`));
    const pxBeat = _pxBeat();
    const startX = e.clientX, startStart = item.start || 0;
    const orig = h.map(it => it.start || 0);            // snapshot — recompute from this each move
    let dragging = false, pos = orig.slice();
    try { bar.setPointerCapture(e.pointerId); } catch (_) {}

    const apply = p => {
      for (let k = 0; k < h.length; k++) if (els[k]) {
        els[k].style.setProperty('--start', p[k]);
        els[k].classList.toggle('off', (p[k] % 1) !== 0);
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      if (!dragging && Math.abs(dx) > 6) { dragging = true; bar.classList.add('dragging'); bar.style.zIndex = '6'; }
      if (!dragging) return;
      ev.preventDefault();
      const snapped = Math.max(0, _snapTo(startStart + dx / pxBeat));   // snap per the ruler setting
      pos[i] = snapped;                                  // pos persists across moves (push is a ratchet)
      _pushCollisions(pos, h, i, snapped >= startStart ? 1 : -1);   // shove overlapped clips aside; they stay shoved
      apply(pos);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      bar.classList.remove('dragging'); bar.style.zIndex = '';
      if (dragging) {
        for (let k = 0; k < h.length; k++) h[k].start = pos[k];
        HistoryEngine.render(); renderProgressionStory(); saveState();
        if (typeof AudioEngine === 'object') AudioEngine.tick(360, 0.06);
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
  // The island transport play buttons mirror the builder's Play/Stop state.
  document.querySelectorAll('#transportSheet .ts-play').forEach(b => {
    if (typeof setIcon === 'function') setIcon(b, playing ? 'stop' : 'play');
    b.classList.toggle('is-stop', playing);
  });
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
// The ▶/■ button toggles playback. It's a UNIVERSAL stop: if anything is
// playing anywhere (the progression, the metronome, or the production groove)
// one tap stops it all — no need to hunt down the exact button you started it
// from. Otherwise it starts the progression.
function toggleProgPlay() {
  const metroOn = !!document.getElementById('metronome')?.classList.contains('running');
  const prodOn  = (typeof playing !== 'undefined' && playing);
  if (_progRAF || metroOn || prodOn) {
    if (_progRAF) stopProgression();
    if (metroOn && typeof Metronome === 'object' && Metronome.stop) Metronome.stop();
    if (prodOn && typeof stopPlay === 'function') stopPlay();
    return;
  }
  // Chain on → play the whole song from the top (section A).
  if (st.chain && _sectionHas('A') && st.activeSection !== 'A') switchSection('A');
  playProgression();
}

// Loop toggle — repeats the progression until you stop it.
function toggleLoop(el) {
  st.loop = !st.loop; saveState();
  if (el) { el.classList.toggle('active', !!st.loop); el.setAttribute('aria-pressed', !!st.loop); }
}

// ── A/B sections ──────────────────────────────────────
// Switch the editable part. st.history mirrors the active section, so swapping it
// re-points everything (render, add, play) at the other part without touching them.
function switchSection(name, opts) {
  opts = opts || {};
  if ((name !== 'A' && name !== 'B') || !st.sections) return;
  if (name === st.activeSection && !opts.force) { _syncSectionTabs(); return; }
  st.sections[st.activeSection] = st.history;          // stash the current part
  st.activeSection = name;
  st.history = st.sections[name] || (st.sections[name] = []);
  if (!opts.keepPlaying && typeof _progRAF !== 'undefined' && _progRAF) stopProgression();
  _playheadBeat = 0;
  HistoryEngine.render();
  if (typeof renderProgressionStory === 'function') renderProgressionStory();
  if (typeof GuitarShapes === 'object') GuitarShapes.onProgressionChange();
  _syncSectionTabs();
  saveState();
}
function _syncSectionTabs() {
  document.querySelectorAll('.sect-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.sect === st.activeSection));
}
function _sectionHas(name) {
  return !!(st.sections && Array.isArray(st.sections[name]) && st.sections[name].length);
}
// Chain toggle — when on, Play runs the whole song A→B instead of just one part.
function toggleChain(el) {
  st.chain = !st.chain; saveState();
  if (el) { el.classList.toggle('active', !!st.chain); el.setAttribute('aria-pressed', !!st.chain); }
}
// Reveal/hide the secondary builder actions (keeps the bar clean by default).
function toggleBuilderMore(el) {
  const m = document.getElementById('builderMore'); if (!m) return;
  const open = m.hasAttribute('hidden');
  if (open) m.removeAttribute('hidden'); else m.setAttribute('hidden', '');
  if (el) { el.classList.toggle('active', open); el.setAttribute('aria-expanded', open); }
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
  const l = document.getElementById('loopBtn');   if (l) { l.classList.toggle('active', !!st.loop); l.setAttribute('aria-pressed', !!st.loop); }
  const ch = document.getElementById('chainBtn'); if (ch) { ch.classList.toggle('active', !!st.chain); ch.setAttribute('aria-pressed', !!st.chain); }
  if (typeof _syncSectionTabs === 'function') _syncSectionTabs();
}

function playProgression() {
  if (typeof AudioEngine !== 'object') return;
  const h = Array.isArray(st.history) ? st.history : [];
  cancelAnimationFrame(_progRAF); _progRAF = 0;
  document.querySelectorAll('.builder-step.playing').forEach(p => p.classList.remove('playing'));

  if (!h.length) { AudioEngine.playChord(chordPitchesForDegree(curDeg >= 0 ? curDeg : 0)); return; }

  const secPerBeat = 60 / (st.bpm || 100);
  const pxBeat     = _pxBeat();
  const chordBeats = h.map(it => Math.max(0.25, it.beats || 2));     // each chord's own duration
  const { starts, total: totalBeats } = _layout(h);                 // absolute start of each clip

  // Resume from the playhead (or the top if it's at/near the end).
  const startBeat = _playheadBeat >= totalBeats - 0.25 ? 0 : Math.max(0, _playheadBeat);

  // Count-in: start the Metronome so it ticks through the whole progression.
  let leadSec = 0;
  if (st.countIn && !Metronome.playing) {
    Metronome.start();
    _metroStartedByPlay = true;
    leadSec = 4 * secPerBeat + 0.08;   // 4-beat count-in matches Metronome's internal lookahead
  }

  // Schedule each clip at its absolute start (in time order, voice-led). Clips can
  // overlap or leave gaps, so we schedule them directly rather than as a packed
  // sequence — that's what makes free placement and contratiempo audible.
  const order = h.map((_, k) => k).sort((a, b) => starts[a] - starts[b]);
  const t0audio = AudioEngine.now() + leadSec;
  let prevUpper = null;
  order.forEach(k => {
    const s = starts[k], endB = s + chordBeats[k];
    if (endB <= startBeat + 0.001) return;                          // already passed
    const whenBeat = s - startBeat;
    const when = t0audio + Math.max(0, whenBeat) * secPerBeat;
    const durB = whenBeat < 0 ? endB - startBeat : chordBeats[k];   // mid-clip resume → remaining time
    const v = AudioEngine._leadVoicing(prevUpper, chordPitchesForItem(h[k]));
    AudioEngine.playChord(v.all, Math.min(2.4, durB * secPerBeat * 0.96), when, false);
    prevUpper = v.upper;
  });
  const totalSec = Math.max(0.1, (totalBeats - startBeat) * secPerBeat);
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
    if (ph) { ph.style.transform = `translateX(${globalBeat * pxBeat}px)`; _playheadBeat = globalBeat; }
    bars.forEach((b, k) => b.classList.toggle('playing', elapsed < totalSec && globalBeat >= starts[k] && globalBeat < starts[k] + chordBeats[k]));
    if (elapsed < totalSec) { _progRAF = requestAnimationFrame(frame); }
    else {
      // A part finished. Decide what's next: continue the song (A→B), loop, or stop.
      bars.forEach(b => b.classList.remove('playing'));
      _progRAF = 0; _playheadBeat = 0;
      const chaining = !!st.chain && _sectionHas('A') && _sectionHas('B');
      if (chaining && st.activeSection === 'A') {
        switchSection('B', { keepPlaying: true });    // A → B (keeps metronome running)
        playProgression();
      } else if (st.loop) {
        // Loop on: restart without stopping (the running metronome/count-in state
        // carries over, so there's no extra count-in each cycle).
        if (chaining) switchSection('A', { keepPlaying: true });   // song loop → back to A
        playProgression();
      } else {
        if (chaining && st.activeSection === 'B') switchSection('A', { keepPlaying: true }); // reset view to A
        if (ph) ph.classList.remove('on');
        setProgBtn(false);
        _updatePlayheadPos();
        if (_metroStartedByPlay) { Metronome.stop(); _metroStartedByPlay = false; }
      }
    }
  };
  _progRAF = requestAnimationFrame(frame);
}
