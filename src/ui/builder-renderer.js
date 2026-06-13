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

    // Clear __justAdded flag after render so re-renders don't repeat the animation
    h.forEach(it => { delete it.__justAdded; });

    if (!h.length) {
      root.innerHTML = `<div class="builder-empty">${t('builder.empty')}</div>`;
      BuilderEngine.meta();
      return;
    }

    root.innerHTML = h.map((it, i) => `
      ${i ? '<span class="builder-arrow">→</span>' : ''}
      <button data-uid="${it.uid || i}" class="builder-step" draggable="true"
        ondragstart="HistoryEngine.dragStart(event,${i})"
        ondragover="event.preventDefault()"
        ondrop="HistoryEngine.drop(event,${i})"
        onclick="HistoryEngine.recall(${i})">
        <span class="step-num">${i + 1}</span>
        <span class="step-chord">${it.chord}</span>
        <span class="step-degree">${it.degree}</span>
        <span class="step-tools">
          <span class="step-tool" title="Move left"  onclick="event.stopPropagation();BuilderEngine.move(${i},-1)">‹</span>
          <span class="step-tool" title="Duplicate"  onclick="event.stopPropagation();BuilderEngine.duplicate(${i})">+</span>
          <span class="step-tool" title="Delete"     onclick="event.stopPropagation();HistoryEngine.remove(${i})">×</span>
          <span class="step-tool" title="Move right" onclick="event.stopPropagation();BuilderEngine.move(${i},1)">›</span>
        </span>
      </button>`).join('');

    // Animate only the last added pill
    const lastEl = root.querySelector('.builder-step:last-of-type');
    if (lastEl) { lastEl.classList.add('just-added'); setTimeout(() => lastEl.classList.remove('just-added'), 600); }

    BuilderEngine.meta();
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

// ── Progression playback (V4.1) ───────────────────────
let _progPlayTimers = [];
function playProgression() {
  if (typeof AudioEngine !== 'object') return;
  const h = Array.isArray(st.history) ? st.history : [];
  _progPlayTimers.forEach(clearTimeout); _progPlayTimers = [];
  document.querySelectorAll('.builder-step.playing').forEach(p => p.classList.remove('playing'));

  // Nothing built yet → just sound the currently selected chord.
  if (!h.length) { AudioEngine.playChord(chordPitchesForDegree(curDeg >= 0 ? curDeg : 0)); return; }

  const step = 0.62;
  AudioEngine.playSequence(h.map(it => chordPitchesForItem(it)), step, 0.72);

  const pills = [...document.querySelectorAll('#flowRow .builder-step')];
  pills.forEach((p, i) => {
    _progPlayTimers.push(setTimeout(() => {
      pills.forEach(x => x.classList.remove('playing'));
      p.classList.add('playing');
      if (i === pills.length - 1) _progPlayTimers.push(setTimeout(() => p.classList.remove('playing'), step * 1000));
    }, i * step * 1000));
  });
}
