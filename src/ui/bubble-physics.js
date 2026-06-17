// ── BUBBLE FIELD — spring physics + interaction (V5.3) ──
// Drives the suggestion bubbles: a per-bubble critically-damped spring rAF for
// press squash & stretch, hover lift and drag follow (CSS keyframes handle the
// idle float and living specular). Folds in the app's behaviour: a tap adds the
// chord at the end (with the fly-to-pill), a drag drops it at a timeline slot.
const BubbleField = {
  bubbles: [], raf: 0, last: 0, reduced: false, canHover: true,

  mount() {
    this.unmount();
    const root = document.querySelector('.next-orbit'); if (!root) return;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.canHover = matchMedia('(hover:hover)').matches;
    this.bubbles = [...root.querySelectorAll('.next-bubble')].map(el => {
      const o = {
        el, body: el.querySelector('.nb-body'), rip: el.querySelector('.nb-rip'),
        to: +el.dataset.to, best: el.dataset.best === '1',
        sc:{x:1,v:0,t:1}, sq:{x:0,v:0,t:0}, lf:{x:0,v:0,t:0}, dx:{x:0,v:0,t:0}, dy:{x:0,v:0,t:0},
        pressed:false, hover:false, dragging:false, moved:false, ddx:0, ddy:0, sx:0, sy:0, pid:null, target:-1,
      };
      this._wire(o);
      return o;
    });
    if (!this.reduced && this.bubbles.length) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(t => BubbleField._tick(t));
    }
  },
  unmount() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0; this.bubbles = [];
    if (typeof SuggestionDrag === 'object' && SuggestionDrag._clearMarker) SuggestionDrag._clearMarker();
  },

  _step(s, k, d, dt) { s.v += (-k * (s.x - s.t) - d * s.v) * dt; s.x += s.v * dt; },
  _tick(now) {
    const dt = Math.min((now - this.last) / 1000, 0.032); this.last = now;
    for (const b of this.bubbles) {
      this._step(b.sc, 320, 15, dt); this._step(b.sq, 340, 13, dt);
      this._step(b.lf, 260, 24, dt); this._step(b.dx, 190, 21, dt); this._step(b.dy, 190, 21, dt);
      const sq = Math.max(-0.25, Math.min(0.25, b.sq.x));
      const sx = b.sc.x * (1 + sq), sy = b.sc.x * (1 - sq);
      b.body.style.transform = `translate(${b.dx.x.toFixed(2)}px,${(b.dy.x + b.lf.x).toFixed(2)}px) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
    }
    this.raf = requestAnimationFrame(t => BubbleField._tick(t));
  },
  _targets(b) {
    let sc = 1, lf = 0;
    if (b.pressed && !b.dragging) { sc = .9; lf = -2; }
    else if (b.dragging) { sc = 1.08; lf = -14; }
    else if (b.hover) { sc = 1.06; lf = -9; }
    b.sc.t = sc; b.lf.t = lf;
    b.dx.t = b.dragging ? b.ddx : 0; b.dy.t = b.dragging ? b.ddy : 0;
  },
  _simple(b) {   // reduced-motion fallback: a plain CSS transition
    let s = 1, ty = 0;
    if (b.pressed && !b.dragging) s = .94; else if (b.dragging) { s = 1.04; ty = -6; } else if (b.hover) { s = 1.05; ty = -7; }
    b.body.style.transition = 'transform .14s ease';
    b.body.style.transform = `translate(${b.dragging ? b.ddx : 0}px,${(b.dragging ? b.ddy : 0) + ty}px) scale(${s})`;
  },
  _apply(b) { this.reduced ? this._simple(b) : this._targets(b); },

  _wire(b) {
    const el = b.el;
    el.addEventListener('pointerdown', e => {
      b.pressed = true; b.moved = false; b.dragging = false; b.pid = e.pointerId;
      b.sx = e.clientX; b.sy = e.clientY; b.ddx = 0; b.ddy = 0; b.target = -1;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      b.sq.t = .09; this._ripple(b, e); this._apply(b);
    });
    el.addEventListener('pointermove', e => {
      if (!b.pressed) return;
      const ddx = e.clientX - b.sx, ddy = e.clientY - b.sy;
      if (!b.moved && Math.hypot(ddx, ddy) > 7) { b.moved = true; b.dragging = true; b.sq.t = 0; }
      if (b.dragging) {
        e.preventDefault(); b.ddx = ddx; b.ddy = ddy;
        const row = document.getElementById('flowRow');
        if (typeof SuggestionDrag === 'object') { b.target = SuggestionDrag._insertIndex(row, e.clientX, e.clientY); SuggestionDrag._marker(row, b.target); }
        this._apply(b);
      }
    });
    const up = () => {
      if (!b.pressed) return;
      b.pressed = false;
      try { el.releasePointerCapture(b.pid); } catch (_) {}
      if (!b.moved) { b.sq.t = 0; b.sq.v = -1.7; b.sc.v += 3.4; this._add(b); }      // tap → add at end
      else { if (b.target >= 0) this._drop(b); b.sq.t = 0; if (typeof SuggestionDrag === 'object' && SuggestionDrag._clearMarker) SuggestionDrag._clearMarker(); }
      b.dragging = false; b.ddx = 0; b.ddy = 0; b.target = -1;
      this._apply(b);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerenter', () => { if (!this.canHover) return; b.hover = true; this._apply(b); });
    el.addEventListener('pointerleave', () => { b.hover = false; this._apply(b); });
  },

  _accentRGB() { return (getComputedStyle(document.body).getPropertyValue('--ba-rgb').trim() || '232,68,26'); },
  _ripple(b, e) {
    if (this.reduced || !b.rip) return;
    const r = b.body.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, size = Math.max(r.width, r.height) * 2.3;
    const rgb = this._accentRGB();
    const c1 = b.best ? 'rgba(255,255,255,.6)' : `rgba(${rgb},.5)`;
    const c0 = b.best ? 'rgba(255,255,255,0)' : `rgba(${rgb},0)`;
    const sp = document.createElement('span');
    sp.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin-left:${-size / 2}px;margin-top:${-size / 2}px;border-radius:999px;pointer-events:none;background:radial-gradient(circle, ${c1}, ${c0} 62%)`;
    b.rip.appendChild(sp);
    sp.animate([{ transform: 'scale(0)', opacity: .95 }, { transform: 'scale(1)', opacity: 0 }],
      { duration: 620, easing: 'cubic-bezier(.22,.61,.36,1)' }).onfinish = () => sp.remove();
  },

  _add(b) {   // tap → play, add at end, fly the bubble into its new pill
    if (typeof AudioEngine === 'object') AudioEngine.playChord(chordPitchesForDegree(b.to));
    const from = b.el.getBoundingClientRect();
    const chord = b.el.querySelector('.nb-chord')?.textContent || '';
    AppActions.selectDegree(b.to, { force: true });
    if (!this.reduced && typeof _flyGhost === 'function') {
      requestAnimationFrame(() => {
        const pill = document.querySelector('.builder-step:last-of-type');
        const to = pill && pill.getBoundingClientRect();
        if (to) _flyGhost(from, to, chord);
      });
    }
  },
  _drop(b) {  // drag → drop at a timeline slot
    if (typeof AudioEngine === 'object') AudioEngine.playChord(chordPitchesForDegree(b.to));
    HistoryEngine.addDegree(b.to, { at: b.target });
  },
};
