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
    this._syncSoundUI();
  },

  setSound(s) {
    st.metroSound = s; saveState();
    this._syncSoundUI();
    if (typeof AudioEngine === 'object') AudioEngine.metroClick(true);   // preview
  },
  _syncSoundUI() {
    const cur = (typeof st === 'object' && st.metroSound) || 'woodblock';
    document.querySelectorAll('.ms-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.s === cur)
    );
  },

  bpm() { return Math.max(this.MIN, Math.min(this.MAX, st.bpm || 100)); },
  // 0.1-BPM precision (tap tempo measures real tracks — 122.4 matters when beat-matching).
  // The dial and +/- steppers snap to integers via stepBpm/their own rounding.
  setBpm(v) {
    st.bpm = Math.max(this.MIN, Math.min(this.MAX, Math.round(v * 10) / 10));
    saveState();
    this.render();
  },
  stepBpm(d) { this.setBpm(Math.round(this.bpm()) + d); },

  toggleOpen() {
    this.open = !this.open;
    document.getElementById('metronome')?.classList.toggle('open', this.open);
    document.querySelector('#metronome .metro-pill')?.setAttribute('aria-expanded', this.open ? 'true' : 'false');
    // Escape + click-outside are handled centrally by OverlayManager ('metronome').
    if (this.open && typeof OverlayManager === 'object') OverlayManager.opened('metronome');
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
    if (b && typeof setIcon === 'function') setIcon(b, this.playing ? 'stop' : 'play');
  },

  // ── Tap tempo (V6.06 redesign — measurement-grade) ────
  // Precision by construction:
  //  · timestamps at CONTACT (pointerdown e.timeStamp, high-res) — onclick fired
  //    on release and added 30-150ms of variable hold-time jitter per tap;
  //  · up to 12 taps kept — more taps while a track plays = tighter estimate;
  //  · median interval + mean of intervals within +/-25% of it — one flubbed tap
  //    (a flam, a missed beat) is rejected instead of wrecking the average;
  //  · <180ms bounce guard (accidental double-fires ignored, not counted);
  //  · >2.2s gap starts a fresh measurement;
  //  · result applied live at 0.1 BPM (122.4 is not 122 when beat-matching).
  _taps: [],
  tap(e) {
    const now = (e && typeof e.timeStamp === 'number' && e.timeStamp > 0) ? e.timeStamp : performance.now();
    const last = this._taps[this._taps.length - 1];
    if (last != null && now - last < 180) return;            // bounce/double-fire: ignore
    if (last != null && now - last > 2200) this._taps = [];  // new measurement
    this._taps.push(now);
    if (this._taps.length > 12) this._taps.shift();

    const el = document.getElementById('metronome');
    if (el) { el.classList.remove('beat'); void el.offsetWidth; el.classList.add('beat'); }
    if (typeof AudioEngine === 'object') AudioEngine.tick(300, 0.08);
    if (typeof haptic === 'function') haptic('tap');

    const es = st.lang === 'es';
    const hint = document.getElementById('metroTapHint');
    if (this._taps.length < 2) { if (hint) hint.textContent = es ? 'sigue tocando al ritmo…' : 'keep tapping to the beat…'; return; }

    const ivs = [];
    for (let i = 1; i < this._taps.length; i++) ivs.push(this._taps[i] - this._taps[i - 1]);
    const sorted = [...ivs].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const kept = ivs.filter(iv => Math.abs(iv - med) <= med * 0.25);
    const avg = kept.reduce((a, b) => a + b, 0) / kept.length;
    const bpm = 60000 / avg;
    if (bpm >= this.MIN && bpm <= this.MAX) {
      this.setBpm(bpm);
      if (hint) hint.textContent = `${bpm.toFixed(1)} BPM · ${kept.length + 1} taps`;
    } else if (hint) {
      hint.textContent = es ? 'fuera de rango (40-240)' : 'out of range (40-240)';
    }
  },

  // Reset the tap hint to its idle prompt in the current language.
  syncTapHint() {
    const hint = document.getElementById('metroTapHint');
    if (hint && (!this._taps || this._taps.length < 2)) hint.textContent = t('metro.tapHint');
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
    const bv = this.bpm();
    const label = Number.isInteger(bv) ? bv : bv.toFixed(1);
    document.querySelectorAll('#metronome .metro-bpm').forEach(e => e.textContent = label);
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
      this.setBpm(Math.round(this.MIN + frac * (this.MAX - this.MIN)));
    };
    dial.addEventListener('pointerdown', e => { dragging = true; dial.setPointerCapture?.(e.pointerId); fromEvt(e); });
    dial.addEventListener('pointermove', e => { if (dragging) fromEvt(e); });
    window.addEventListener('pointerup', () => { dragging = false; });
  },
};
