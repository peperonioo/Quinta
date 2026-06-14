// ── CHORD VARIANTS (V4.4) ─────────────────────────────
// Tap a suggested chord (or a timeline bar's "variants" button) to open a
// Dynamic-Island-style chooser that expands up/down with the chord's variants
// (7, maj7, sus, add9…). Replaces the global "7ths" toggle with per-chord choice.

// Intervals (semitones from root) per base quality. `suf` is the name suffix.
const CHORD_VARIANTS = {
  Maj: [
    { id:'triad', suf:'',       iv:[0,4,7] },
    { id:'maj7',  suf:'maj7',   iv:[0,4,7,11] },
    { id:'7',     suf:'7',      iv:[0,4,7,10] },
    { id:'6',     suf:'6',      iv:[0,4,7,9] },
    { id:'add9',  suf:'add9',   iv:[0,4,7,14] },
    { id:'sus2',  suf:'sus2',   iv:[0,2,7] },
    { id:'sus4',  suf:'sus4',   iv:[0,5,7] },
    { id:'9',     suf:'9',      iv:[0,4,7,10,14] },
  ],
  Min: [
    { id:'triad', suf:'m',      iv:[0,3,7] },
    { id:'m7',    suf:'m7',     iv:[0,3,7,10] },
    { id:'m9',    suf:'m9',     iv:[0,3,7,10,14] },
    { id:'m6',    suf:'m6',     iv:[0,3,7,9] },
    { id:'madd9', suf:'m(add9)',iv:[0,3,7,14] },
    { id:'sus2',  suf:'sus2',   iv:[0,2,7] },
    { id:'sus4',  suf:'sus4',   iv:[0,5,7] },
  ],
  Dim: [
    { id:'triad', suf:'°',      iv:[0,3,6] },
    { id:'m7b5',  suf:'m7♭5',   iv:[0,3,6,10] },
    { id:'dim7',  suf:'°7',     iv:[0,3,6,9] },
  ],
};

function variantsFor(quality) { return CHORD_VARIANTS[quality] || CHORD_VARIANTS.Maj; }
function variantDef(quality, id) {
  const list = variantsFor(quality);
  return list.find(v => v.id === id) || list[0];
}

// Root note of a chord item (base chord string with the m/° suffix stripped).
function chordRootOf(it) {
  if (it && it.note != null) return it.note;
  return String(it && it.chord || 'C').replace(/°/g, '').replace(/m$/, '');
}

// Display name including the chosen variant: Cmaj7, G7, Dsus4, B°7…
function chordDisplay(it) {
  if (!it) return '';
  if (!it.variant || it.variant === 'triad') return it.chord;
  const root = chordRootOf(it);
  return root + (variantDef(it.quality, it.variant).suf || '');
}

// Chord chooser/settings for a builder bar. Compact vertical chooser: variant
// chips fan ABOVE and BELOW the tapped bar (the bar itself stays visible and
// tappable in the gap). Bars only — suggestions stay a fast tap-to-add.
const ChordVariants = {
  el: null, ctx: null, _anchorRect: null, _outside: null, _key: null,

  _ensure() {
    if (this.el) return this.el;
    const d = document.createElement('div');
    d.id = 'chordVariants';
    d.className = 'chord-variants';
    d.setAttribute('role', 'menu');
    d.setAttribute('aria-label', 'Chord variants and settings');
    document.body.appendChild(d);
    this.el = d;
    return d;
  },

  openForBar(barIdx) {
    const it = (st.history || [])[barIdx]; if (!it) return;
    const bar = document.querySelector(`#flowRow .builder-step[data-i="${barIdx}"]`);
    this._open({ barIdx, quality:it.quality, root:chordRootOf(it), baseChord:it.chord, degree:it.degree, current:it.variant || 'triad' }, bar);
  },

  _open(ctx, anchorEl) {
    if (this._outside) document.removeEventListener('click', this._outside, true);
    this.ctx = ctx;
    this._anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null;
    const el = this._ensure();
    const root = ctx.root;
    const list = variantsFor(ctx.quality);
    const mid  = Math.ceil(list.length / 2);
    const chip = v => `<button class="cv-chip${ctx.current === v.id ? ' active' : ''}" role="menuitemradio" aria-checked="${ctx.current === v.id}" onclick="ChordVariants.pick('${v.id}')">${root}${v.suf || ''}</button>`;
    // top group sits above the bar (rendered so the nearest is closest to it)
    const top = list.slice(0, mid).map(chip).join('');
    const bot = list.slice(mid).map(chip).join('');
    el.innerHTML = `
      <div class="cv-above">${top}</div>
      <div class="cv-mid" aria-hidden="true"></div>
      <div class="cv-below">
        ${bot}
        <div class="cv-foot">
          <button class="cv-act" onclick="ChordVariants._dup()" aria-label="Duplicate chord">＋</button>
          <button class="cv-act danger" onclick="ChordVariants._del()" aria-label="Delete chord">×</button>
        </div>
      </div>`;
    // size the gap to the bar so it shows through
    const gap = el.querySelector('.cv-mid');
    if (gap && this._anchorRect) gap.style.height = this._anchorRect.height + 'px';
    el.style.display = 'block';
    this._place();
    requestAnimationFrame(() => el.classList.add('open'));
    this._outside = e => {
      if (e.target.closest('#chordVariants') || e.target.closest('.builder-step')) return;
      this.close();
    };
    setTimeout(() => document.addEventListener('click', this._outside, true), 0);
    this._key = e => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._key, true);
  },

  _place() {
    const el = this.el, r = this._anchorRect; if (!el) return;
    const pad = 8, w = el.offsetWidth;
    const above = el.querySelector('.cv-above');
    const ah = above ? above.offsetHeight : 0;
    let left = r ? r.left + r.width / 2 - w / 2 : innerWidth / 2 - w / 2;
    // Align the transparent middle gap over the bar so it stays visible.
    let top  = r ? r.top - ah : innerHeight / 2 - el.offsetHeight / 2;
    left = Math.max(pad, Math.min(left, innerWidth - w - pad));
    top  = Math.max(pad, Math.min(top, innerHeight - el.offsetHeight - pad));
    el.style.left = left + 'px';
    el.style.top  = top + 'px';
  },

  pick(id) {
    const ctx = this.ctx; if (!ctx) return;
    const rootPitch = ni(ctx.root);
    if (typeof AudioEngine === 'object') AudioEngine.playChord(variantDef(ctx.quality, id).iv.map(x => rootPitch + x));
    const it = (st.history || [])[ctx.barIdx];
    if (it) { it.variant = id; HistoryEngine.render(); renderProgressionStory(); saveState(); }
    this.close();
  },

  _dup() {
    const ctx = this.ctx; if (!ctx || ctx.kind !== 'bar') return;
    if (typeof BuilderEngine === 'object') BuilderEngine.duplicate(ctx.barIdx);
    this.close();
  },
  _del() {
    const ctx = this.ctx; if (!ctx || ctx.kind !== 'bar') return;
    if (typeof HistoryEngine === 'object') HistoryEngine.remove(ctx.barIdx);
    this.close();
  },

  close() {
    if (this.el) {
      this.el.classList.remove('open');
      const el = this.el;
      setTimeout(() => { if (el && !el.classList.contains('open')) el.style.display = 'none'; }, 220);
    }
    if (this._outside) document.removeEventListener('click', this._outside, true);
    if (this._key) document.removeEventListener('keydown', this._key, true);
    this._outside = null; this._key = null; this.ctx = null;
  },
};
