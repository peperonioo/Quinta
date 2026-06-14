// ── METRONOME (V4.2) ──────────────────────────────────
// A small Dynamic-Island-style bubble: tap to expand a rotary BPM dial with a
// classic analog tick. The BPM is shared (st.bpm) so the progression Play uses
// the same tempo.

const Metronome = {
  open: false, playing: false, _timer: null, _next: 0, _beat: 0,
  MIN: 40, MAX: 240, SWEEP: 270,   // degrees of dial travel (gap at the bottom)

  init() {
    this._dialDrag();
    this.render();
  },

  bpm() { return Math.max(this.MIN, Math.min(this.MAX, st.bpm || 100)); },
  setBpm(v) {
    st.bpm = Math.max(this.MIN, Math.min(this.MAX, Math.round(v)));
    saveState();
    this.render();
  },

  toggleOpen() {
    this.open = !this.open;
    document.getElementById('metronome')?.classList.toggle('open', this.open);
    document.querySelector('#metronome .metro-pill')?.setAttribute('aria-expanded', this.open ? 'true' : 'false');
    if (this.open) {
      this._esc = e => { if (e.key === 'Escape') this.toggleOpen(); };
      document.addEventListener('keydown', this._esc, true);
    } else if (this._esc) {
      document.removeEventListener('keydown', this._esc, true); this._esc = null;
    }
  },
  toggle() { this.playing ? this.stop() : this.start(); },

  start() {
    if (typeof AudioEngine !== 'object' || !AudioEngine.resume()) return;
    this.playing = true; this._beat = 0;
    this._next = AudioEngine.now() + 0.08;
    this._timer = setInterval(() => this._schedule(), 25);
    document.getElementById('metronome')?.classList.add('running');
    this._playBtn();
  },
  stop() {
    this.playing = false;
    clearInterval(this._timer); this._timer = null;
    document.getElementById('metronome')?.classList.remove('running');
    this._playBtn();
  },

  _schedule() {
    const ctx = AudioEngine.ctx; if (!ctx) return;
    const spb = 60 / this.bpm();
    while (this._next < ctx.currentTime + 0.12) {
      const accent = this._beat % 4 === 0;
      AudioEngine.metroClick(accent, this._next);
      this._flash(this._next - ctx.currentTime, accent);
      this._next += spb; this._beat++;
    }
  },
  _flash(delay, accent) {
    setTimeout(() => {
      const el = document.getElementById('metronome'); if (!el) return;
      el.classList.toggle('accent', accent);
      el.classList.remove('beat'); void el.offsetWidth; el.classList.add('beat');
    }, Math.max(0, delay * 1000));
  },
  _playBtn() {
    const b = document.getElementById('metroPlay');
    if (b) b.textContent = this.playing ? '■' : '▶';
  },

  // ── Tap tempo ─────────────────────────────────────────
  // Average the intervals over the last few taps for an accurate, stable BPM
  // (using the rolling average means the number doesn't jump around on each tap).
  _taps: [],
  tap() {
    const now = performance.now();
    if (this._taps.length && now - this._taps[this._taps.length - 1] > 2000) this._taps = []; // new burst
    this._taps.push(now);
    if (this._taps.length > 5) this._taps.shift();   // keep last 5 taps → up to 4 intervals

    const el = document.getElementById('metronome');
    if (el) { el.classList.remove('beat'); void el.offsetWidth; el.classList.add('beat'); }
    if (typeof AudioEngine === 'object') AudioEngine.tick(300, 0.08);

    const hint = document.getElementById('metroTapHint');
    if (this._taps.length < 4) { if (hint) hint.textContent = `keep tapping… ${this._taps.length}/4`; }
    if (this._taps.length < 2) return;

    const ivs = [];
    for (let i = 1; i < this._taps.length; i++) ivs.push(this._taps[i] - this._taps[i - 1]);
    const avg = ivs.reduce((a, b) => a + b, 0) / ivs.length;
    const bpm = 60000 / avg;
    if (bpm >= this.MIN - 6 && bpm <= this.MAX + 6) {
      this.setBpm(bpm);
      if (hint && this._taps.length >= 4) hint.textContent = 'tempo set · keep tapping';
    }
  },

  // ── Dial geometry (from-top, clockwise) ──────────────
  _pt(r, deg) {
    const a = deg * Math.PI / 180;
    return [90 + r * Math.sin(a), 90 - r * Math.cos(a)];
  },
  _arc(r, a0, a1) {
    const [x0, y0] = this._pt(r, a0), [x1, y1] = this._pt(r, a1);
    const large = (a1 - a0) > 180 ? 1 : 0;
    return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
  },

  render() {
    document.querySelectorAll('#metronome .metro-bpm').forEach(e => e.textContent = this.bpm());
    const a0 = -this.SWEEP / 2, a1 = this.SWEEP / 2;
    const frac = (this.bpm() - this.MIN) / (this.MAX - this.MIN);
    const ang = a0 + frac * this.SWEEP;
    const track = document.getElementById('metroTrack');
    const prog  = document.getElementById('metroArc');
    const hand  = document.getElementById('metroHandle');
    if (track) track.setAttribute('d', this._arc(70, a0, a1));
    if (prog)  prog.setAttribute('d', this._arc(70, a0, ang));
    if (hand) { const [hx, hy] = this._pt(70, ang); hand.setAttribute('cx', hx.toFixed(1)); hand.setAttribute('cy', hy.toFixed(1)); }
  },

  _dialDrag() {
    const dial = document.getElementById('metroDial'); if (!dial) return;
    let dragging = false;
    const fromEvt = (e) => {
      const r = dial.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const x = (e.clientX ?? e.touches?.[0]?.clientX) - cx;
      const y = (e.clientY ?? e.touches?.[0]?.clientY) - cy;
      let deg = Math.atan2(x, -y) * 180 / Math.PI;       // 0 = top, clockwise
      deg = Math.max(-this.SWEEP / 2, Math.min(this.SWEEP / 2, deg));
      const frac = (deg + this.SWEEP / 2) / this.SWEEP;
      this.setBpm(this.MIN + frac * (this.MAX - this.MIN));
    };
    dial.addEventListener('pointerdown', e => { dragging = true; dial.setPointerCapture?.(e.pointerId); fromEvt(e); });
    dial.addEventListener('pointermove', e => { if (dragging) fromEvt(e); });
    window.addEventListener('pointerup', () => { dragging = false; });
  },
};
