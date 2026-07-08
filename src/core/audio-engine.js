// ── AUDIO ENGINE (V4.1) ───────────────────────────────
// A small, pleasant Web Audio synth: tap a chord to hear it, play the
// progression. Lazily creates the AudioContext on the first user gesture.

const AudioEngine = {
  ctx: null, master: null, wet: null, _playToken: 0, _iosEl: null,
  voiceBus: null, _active: null,

  _ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { this.ctx = new AC(); } catch (_) { return false; }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.32;
    const conv = ctx.createConvolver();
    conv.buffer = this._impulse(1.7, 2.6);
    this.wet = ctx.createGain(); this.wet.gain.value = 0.20;

    // Output routing. On iOS, route the whole mix through an <audio> element
    // (via a MediaStreamDestination). iOS plays HTMLMediaElements on the media
    // channel, which lets audio sound even with the ringer/silent switch on —
    // Web Audio straight to ctx.destination is muted by that switch.
    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let out = ctx.destination;
    if (isIOS && ctx.createMediaStreamDestination) {
      try {
        const msd = ctx.createMediaStreamDestination();
        const el = document.createElement('audio');
        el.srcObject = msd.stream;
        el.setAttribute('playsinline', ''); el.loop = true; el.autoplay = true;
        document.body.appendChild(el);
        this._iosEl = el;
        out = msd;
      } catch (_) { out = ctx.destination; }
    }
    this.master.connect(out);
    this.master.connect(conv); conv.connect(this.wet); this.wet.connect(out);
    // Dry bus — straight to the output, no reverb. Used by the metronome so the
    // click stays tight and mechanical instead of washy.
    this.dry = ctx.createGain(); this.dry.gain.value = 0.9;
    this.dry.connect(out);
    // Voice bus — all musical chord/note voices route through here so playback
    // can be hard-stopped (the old duck-and-restore let scheduled chords resume).
    this.voiceBus = ctx.createGain(); this.voiceBus.gain.value = 1;
    this.voiceBus.connect(this.master);
    // Bass bus — the bass line runs on its own lane so stems export can record
    // chords and bass separately (both still sum into master for normal play).
    this.bassBus = ctx.createGain(); this.bassBus.gain.value = 1;
    this.bassBus.connect(this.master);
    this._active = new Set();
    // Drum bus — percussion runs dry (no reverb wash) at its own level.
    this.drumBus = ctx.createGain(); this.drumBus.gain.value = 0.85;
    this.drumBus.connect(this.dry);
    return true;
  },

  // ── Drum voices — real kit samples per genre when ready, synth fallback ──
  drumHit(type, when = 0, accent = false) {
    if (!this.resume()) return;
    const t = when || this.ctx.currentTime;
    if ((typeof st !== 'object' || st.realPiano !== false) && typeof DrumKits === 'object') {
      const genre = (typeof curGenre !== 'undefined' && curGenre) || (typeof st === 'object' && st.genre) || 'house';
      DrumKits.ensure(genre);                       // idempotent lazy load
      if (DrumKits.play(genre, type, t, accent)) return;
    }
    const fn = { kick:'_kick', clap:'_clap', snare:'_snare', hat:'_hat', open:'_openhat', shaker:'_shaker', rim:'_rim', tom:'_tom', ride:'_ride', cowbell:'_cowbell' }[type];
    if (fn && this[fn]) this[fn](t, accent);
  },
  _noise(t, dur, decay) {
    const ctx = this.ctx, len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    const src = ctx.createBufferSource(); src.buffer = buf; src.start(t);
    return src;
  },
  _kick(t, accent) {
    const ctx = this.ctx, out = this.drumBus;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(accent ? 165 : 145, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(accent ? 1 : 0.86, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.55);
    const click = this._noise(t, 0.01, 6); const cg = ctx.createGain(); cg.gain.value = 0.25;
    click.connect(cg); cg.connect(out);
  },
  _hat(t, accent) {
    const ctx = this.ctx, src = this._noise(t, 0.045, 4);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8500;
    const g = ctx.createGain(); g.gain.value = accent ? 0.34 : 0.24;
    src.connect(hp); hp.connect(g); g.connect(this.drumBus);
  },
  _openhat(t, accent) {
    const ctx = this.ctx, src = this._noise(t, 0.28, 1.4);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(accent ? 0.32 : 0.24, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    src.connect(hp); hp.connect(g); g.connect(this.drumBus);
  },
  _clap(t, accent) {
    const ctx = this.ctx;
    [0, 0.009, 0.018, 0.028].forEach((off, i) => {
      const src = this._noise(t + off, 0.05, 3);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.3;
      const g = ctx.createGain(); g.gain.value = (accent ? 0.46 : 0.36) * (i === 3 ? 1 : 0.6);
      src.connect(bp); bp.connect(g); g.connect(this.drumBus);
    });
  },
  _snare(t, accent) {
    const ctx = this.ctx, out = this.drumBus;
    const src = this._noise(t, 0.13, 2.4);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1600;
    const ng = ctx.createGain(); ng.gain.value = accent ? 0.42 : 0.32;
    src.connect(hp); hp.connect(ng); ng.connect(out);
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(195, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.09);
    const og = ctx.createGain(); og.gain.setValueAtTime(accent ? 0.34 : 0.26, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.14);
  },
  _shaker(t, accent) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5) * Math.min(1, i / (len * 0.3));
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    const g = ctx.createGain(); g.gain.value = accent ? 0.2 : 0.14;
    src.connect(hp); hp.connect(g); g.connect(this.drumBus); src.start(t);
  },
  _rim(t, accent) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1700;
    const g = ctx.createGain(); g.gain.setValueAtTime(accent ? 0.3 : 0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(g); g.connect(this.drumBus); o.start(t); o.stop(t + 0.04);
  },
  _tom(t, accent) {                       // pitched membrane — sine with a downward sweep
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(accent ? 220 : 180, t);
    o.frequency.exponentialRampToValueAtTime(88, t + 0.18);
    const g = ctx.createGain(); g.gain.setValueAtTime(accent ? 0.5 : 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(this.drumBus); o.start(t); o.stop(t + 0.32);
  },
  _ride(t, accent) {                      // metallic ping (inharmonic squares) + a short wash
    const ctx = this.ctx, out = this.drumBus;
    [2300, 3450, 5200].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime((accent ? 0.055 : 0.04) / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.52);
    });
    const src = this._noise(t, 0.45, 1.2);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 7200; bp.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(accent ? 0.1 : 0.07, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(bp); bp.connect(ng); ng.connect(out);
  },
  _cowbell(t, accent) {                   // 808 cowbell — two detuned squares through a bandpass
    const ctx = this.ctx, out = this.drumBus;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2640; bp.Q.value = 1.1;
    const g = ctx.createGain(); g.gain.setValueAtTime(accent ? 0.28 : 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    bp.connect(g); g.connect(out);
    [540, 800].forEach(f => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(bp); o.start(t); o.stop(t + 0.2); });
  },

  _impulse(dur, decay) {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * dur);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  },

  // Must run inside a user gesture (we call it from click handlers).
  resume() {
    if (!this._ensure()) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this._iosEl) { try { this._iosEl.play(); } catch (_) {} }
    // Kick off the sampled-instrument loads on the first gesture (lazy, ~2.7MB total).
    if (typeof st !== 'object' || st.realPiano !== false) {
      if (typeof SamplePiano === 'object') SamplePiano.ensure();
      if (typeof SampleGuitar === 'object') SampleGuitar.ensure();
      if (typeof SampleBass === 'object') SampleBass.ensure();
      // Pack voices load only when the pack is owned AND selected (bandwidth-kind).
      if (typeof packOwned === 'function' && packOwned('pack1') && typeof st === 'object') {
        if (st.pianoSound === 'steel'    && typeof SampleSteel === 'object')    SampleSteel.ensure();
        if (st.pianoSound === 'electric' && typeof SampleElectric === 'object') SampleElectric.ensure();
      }
    }
    return true;
  },

  ready() { return !!this.ctx; },

  // A warm woodblock/rim "tok" — the wheel ratchet on each key crossing. A short
  // body tone with a fast downward pitch chirp through a resonant bandpass, plus
  // a tiny wooden noise click. Low and organic instead of a sharp synthetic beep.
  tick(freq = 200, vol = 0.13) {
    if (!this.resume()) return;
    const ctx = this.ctx, t0 = ctx.currentTime, out = this.dry || this.master;

    // Hollow body: triangle that drops in pitch quickly (the "tok").
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(freq * 2.1, t0);
    o.frequency.exponentialRampToValueAtTime(freq, t0 + 0.028);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = freq * 3; bp.Q.value = 4.5;        // wooden resonance
    const g = ctx.createGain();
    o.connect(bp); bp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);   // short, dry decay
    o.start(t0); o.stop(t0 + 0.07);

    // Tiny wooden "edge" click for attack realism.
    const len = Math.floor(ctx.sampleRate * 0.005);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 1400; cf.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.value = vol * 0.3;
    src.connect(cf); cf.connect(ng); ng.connect(out);
    src.start(t0);
  },

  // ── Wheel dial tick ───────────────────────────────────
  // The sound of the wheel crossing a key: a soft felt "thmp" — deep, muted,
  // tactile, like the detent of a high-end camera dial. All lows, no shrill:
  // a sine knock dropping 185→95Hz through a lowpass, plus a whisper of felt
  // noise. Pitch varies ±4% per tick so a fast spin sounds organic, not robotic.
  dialTick(vol = 0.11) {
    if (!this.resume()) return;
    const ctx = this.ctx, t0 = ctx.currentTime, out = this.dry || this.master;
    const v = 1 + (Math.random() * 0.08 - 0.04);            // organic variation

    // Felt knock: soft-attack sine with a quick downward pitch settle.
    // Mid register (wood, not sub-bass): ~330→180Hz reads as a warm "tock".
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(330 * v, t0);
    o.frequency.exponentialRampToValueAtTime(180 * v, t0 + 0.04);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.5;
    const g = ctx.createGain();
    o.connect(lp); lp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.006);         // soft, not clicky
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    o.start(t0); o.stop(t0 + 0.1);

    // A whisper of felt texture (very quiet, lowpassed noise breath).
    const len = Math.floor(ctx.sampleRate * 0.02);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 1700;
    const ng = ctx.createGain(); ng.gain.value = vol * 0.22;
    src.connect(nf); nf.connect(ng); ng.connect(out);
    src.start(t0);
  },

  // ── Wheel settle — the arrival sound ──────────────────
  // When the spun wheel snaps onto a NEW key, play its root + fifth (the
  // interval the app is named after) as two soft kalimba-like plucks: warm
  // sine bodies with a whisper of octave, through the reverb for a little
  // bloom. Quiet, brief, musical — you HEAR the key you landed on. No bells,
  // no rising arpeggio: the anti-casino arrival.
  dialSettle(pc = 0) {
    if (!this.resume()) return;
    const ctx = this.ctx, out = this.master;              // master → a touch of reverb bloom
    // Fold the root into a warm register (G3–F#4) so no key sounds shrill or muddy.
    const rootPitch = pc > 6 ? pc - 12 : pc;              // pitch 0 = middle C
    const base = this._freq(rootPitch);
    [[0, 0, 0.10], [7, 0.085, 0.075]].forEach(([semi, dt, vol]) => {   // root, then its fifth
      const f = base * Math.pow(2, semi / 12);
      const t0 = ctx.currentTime + dt;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const h = ctx.createOscillator(); h.type = 'sine'; h.frequency.value = f * 2;   // soft octave sheen
      const g = ctx.createGain(), hg = ctx.createGain();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.009);                 // soft pluck, not a click
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      hg.gain.setValueAtTime(0.0001, t0);
      hg.gain.linearRampToValueAtTime(vol * 0.24, t0 + 0.009);
      hg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
      o.connect(g); h.connect(hg); g.connect(lp); hg.connect(lp); lp.connect(out);
      o.start(t0); o.stop(t0 + 0.65); h.start(t0); h.stop(t0 + 0.36);
    });
  },

  // ── Metronome click voices ────────────────────────────
  // Dispatch to the active sound (persisted in st.metroSound).
  metroClick(accent, when) {
    if (!this.resume()) return;
    const t0 = when != null ? when : this.ctx.currentTime;
    const snd = (typeof st === 'object' && st.metroSound) || 'woodblock';
    if      (snd === 'rimshot')    this._metroRim(t0, accent);
    else if (snd === 'electronic') this._metroElectronic(t0, accent);
    else                           this._metroWoodblock(t0, accent);
  },

  // Original analog woodblock — noise burst + pitched tock.
  _metroWoodblock(t0, accent) {
    const ctx = this.ctx, bus = this.dry || this.master;
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 8);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = accent ? 2700 : 1950; bp.Q.value = 1.1;
    const ng = ctx.createGain(); ng.gain.value = accent ? 0.5 : 0.34;
    src.connect(bp); bp.connect(ng); ng.connect(bus); src.start(t0);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.value = accent ? 2050 : 1550;
    const og = ctx.createGain(); o.connect(og); og.connect(bus);
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(accent ? 0.32 : 0.2, t0 + 0.001);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.032);
    o.start(t0); o.stop(t0 + 0.045);
  },

  // TR-808 cowbell: two detuned square oscillators + bandpass shaping.
  _metroCowbell(t0, accent) {
    const ctx = this.ctx, bus = this.dry || this.master;
    [562, 845].forEach(freq => {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
      const g = ctx.createGain();
      g.gain.setValueAtTime(accent ? 0.26 : 0.18, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (accent ? 0.45 : 0.3));
      o.connect(hp); hp.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + 0.55);
    });
  },

  // Snappy rimshot: noise crack + short pitched transient.
  _metroRim(t0, accent) {
    const ctx = this.ctx, bus = this.dry || this.master;
    const src = this._noise(t0, 0.055, 5);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
    const ng = ctx.createGain(); ng.gain.value = accent ? 0.52 : 0.38;
    src.connect(hp); hp.connect(ng); ng.connect(bus);
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.value = accent ? 420 : 320;
    const og = ctx.createGain();
    og.gain.setValueAtTime(accent ? 0.65 : 0.48, t0);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.052);
    o.connect(og); og.connect(bus); o.start(t0); o.stop(t0 + 0.065);
  },

  // Clean electronic blip — minimal sine, bright on the downbeat.
  _metroElectronic(t0, accent) {
    const ctx = this.ctx, bus = this.dry || this.master;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.value = accent ? 1600 : 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(accent ? 0.48 : 0.34, t0 + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.038);
    o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + 0.05);
  },

  // ── Classical / nylon plucked-string voice (extended Karplus-Strong) ──
  // A faithful physical model of a nylon-string guitar, computed sample-by-sample
  // in JS then played back as an AudioBuffer (Web Audio's DelayNode adds a
  // render-quantum latency that detunes high notes, so we can't loop in the graph).
  // Model: pick-position comb + soft excitation → string loop with fractional-delay
  // tuning + one-pole loop damping → body-resonance EQ on output.
  _guitarVoice(freq, t0, gainScale) {
    const ctx = this.ctx, sr = ctx.sampleRate;

    // Loop delay for this pitch. The one-zero loop filter contributes ~0.5 sample
    // of group delay, so target slightly short and make up the rest fractionally.
    const loopD = sr / freq - 0.5;
    const Di = Math.max(2, Math.floor(loopD));
    const frac = loopD - Di;
    const L = Di + 2;                    // circular delay-line length

    // Note length: trebles fade in ~1s, basses ring up to ~2.4s.
    const dur = Math.min(2.4, Math.max(0.5, 2.8 - freq / 200));
    const len = Math.floor(sr * dur);
    const out = new Float32Array(len);

    // ── Excitation: one period of softened noise + pick-position comb ──
    // Soft (lowpassed) noise = nylon's rounded attack; the comb subtracts a copy
    // delayed by the pluck point (~1/5 of the string) → the hollow, woody timbre.
    const dl = new Float32Array(L);
    const nz = new Float32Array(L);
    for (let i = 0; i < L; i++) nz[i] = Math.random() * 2 - 1;
    for (let i = 1; i < L; i++) nz[i] = (nz[i] + nz[i - 1]) * 0.5;
    const pp = Math.max(1, Math.round(0.2 * L));
    for (let i = 0; i < L; i++) dl[i] = nz[i] - (i >= pp ? nz[i - pp] : 0);

    // ── String loop: fractional-delay read + one-zero loop filter + loop gain ──
    // S = loop-filter mix (0.5 = classic averaging). rho = per-sample loop gain
    // tuned so T60 ≈ 1.5s low → ~0.9s high (slightly faster decay up the neck).
    const S = 0.5;
    const rho = Math.min(0.99992, Math.max(0.9996, 0.99992 - freq * 2.5e-7));
    let widx = 0, ydPrev = 0;
    for (let n = 0; n < len; n++) {
      const r0 = (widx - Di + L * 2) % L;
      const r1 = (widx - Di - 1 + L * 2) % L;
      const yd = dl[r0] * (1 - frac) + dl[r1] * frac;   // fractional-delay tuning
      const lf = (1 - S) * yd + S * ydPrev;             // one-zero damping filter
      ydPrev = yd;
      const y = rho * lf;
      out[n] = y;
      dl[widx] = y;
      widx = (widx + 1) % L;
    }

    // Normalize — guarantees no clipping at any pitch.
    let peak = 0;
    for (let n = 0; n < len; n++) { const a = Math.abs(out[n]); if (a > peak) peak = a; }
    if (peak > 1e-4) { const g = (gainScale * 0.5) / peak; for (let n = 0; n < len; n++) out[n] *= g; }

    const audioBuf = ctx.createBuffer(1, len, sr);
    audioBuf.copyToChannel(out, 0);
    const src = ctx.createBufferSource(); src.buffer = audioBuf;

    // ── Body resonance EQ — the hollow wooden character of the guitar body ──
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 75;
    const b1 = ctx.createBiquadFilter(); b1.type = 'peaking'; b1.frequency.value = 100; b1.Q.value = 1.1; b1.gain.value = 3.5; // Helmholtz air
    const b2 = ctx.createBiquadFilter(); b2.type = 'peaking'; b2.frequency.value = 215; b2.Q.value = 1.4; b2.gain.value = 2.5; // top plate
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(freq * 6, 4200); lp.Q.value = 0.5;

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(1, t0 + 0.006);                       // soft pluck attack
    amp.gain.setValueAtTime(1, t0 + Math.max(0.05, dur - 0.06));
    amp.gain.linearRampToValueAtTime(0.0001, t0 + dur);                    // clean release

    src.connect(hp); hp.connect(b1); b1.connect(b2); b2.connect(lp); lp.connect(amp); amp.connect(this.master);
    src.start(t0);
    if (this._active) {
      const entry = { oscs: [src], amp };
      this._active.add(entry);
      src.onended = () => { if (this._active) this._active.delete(entry); };
    }
  },

  playGuitarNote(pitch) {
    if (!this.resume()) return;
    const freq = this._freq(pitch), t0 = this.ctx.currentTime;
    // Real nylon guitar (VSCO2) when enabled + loaded; Karplus-Strong fallback.
    if ((typeof st !== 'object' || st.realPiano !== false) &&
        typeof SampleGuitar === 'object' && SampleGuitar.play(freq, t0, 1.6, 1)) return;
    this._guitarVoice(freq, t0, 1);
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },

  // A soft pleasant shimmer when the wheel is flicked hard.
  swoosh(intensity = 1) {
    if (!this.resume()) return;
    const ctx = this.ctx, t0 = ctx.currentTime, dur = 0.45;
    [0, 7, 12].forEach((semi, i) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(this._freq(semi - 5), t0);
      o.frequency.exponentialRampToValueAtTime(this._freq(semi + 7 + 3 * intensity), t0 + dur);
      const g = ctx.createGain();
      o.connect(g); g.connect(this.master);
      const v = 0.05 * Math.min(1, intensity);
      g.gain.setValueAtTime(0.0001, t0 + i * 0.02);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.06 + i * 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0 + i * 0.02); o.stop(t0 + dur + 0.05);
    });
  },

  _freq(pitch) { return 261.63 * Math.pow(2, pitch / 12); }, // pitch 0 = middle C

  // Dispatch to the selected instrument voice (persisted in st.pianoSound).
  _voice(freq, t0, dur, gainScale = 1) {
    const snd = (typeof st === 'object' && st.pianoSound) || 'piano';
    if (snd === 'epiano') return this._voiceEP(freq, t0, dur, gainScale);
    if (snd === 'brass')  return this._voiceBrass(freq, t0, dur, gainScale);
    // Pack 1 voices — sampled when ready, Karplus-Strong string as the fallback.
    if (snd === 'steel' || snd === 'electric') {
      const smp = snd === 'steel' ? SampleSteel : SampleElectric;
      if ((typeof st !== 'object' || st.realPiano !== false) &&
          typeof smp === 'object' && smp.play(freq, t0, dur, gainScale)) return;
      return this._guitarVoice(freq, t0, gainScale);
    }
    // Real sampled piano (Salamander) when enabled + loaded; synth is the fallback
    // while samples stream in, when offline/file://, or when the user turns it off.
    if ((typeof st !== 'object' || st.realPiano !== false) &&
        typeof SamplePiano === 'object' && SamplePiano.play(freq, t0, dur, gainScale)) return;
    return this._voicePiano(freq, t0, dur, gainScale);
  },

  // ── Acoustic piano — additive, mildly inharmonic partials with a bright,
  // percussive attack that decays into a long, warm sustain. Closest a pure
  // synth gets to a real piano without samples (samples would bloat the build).
  _voicePiano(freq, t0, dur, gainScale = 1, outBus = null) {
    const ctx = this.ctx, out = outBus || this.voiceBus || this.master;
    const amp = ctx.createGain();
    const lp  = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
    lp.frequency.setValueAtTime(Math.min(8000, freq * 8 + 2600), t0);
    lp.frequency.exponentialRampToValueAtTime(Math.max(700, freq * 3), t0 + 0.4);   // brightness fades
    amp.connect(lp); lp.connect(out);
    const parts = [[1, 1.0], [2, 0.52], [3, 0.34], [4, 0.18], [5, 0.10], [6, 0.05]];
    const oscs = [];
    parts.forEach(([h, a]) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = freq * h * (1 + 0.0007 * h * h);                          // slight string stretch
      const g = ctx.createGain(); g.gain.value = a;
      o.connect(g); g.connect(amp); oscs.push(o);
    });
    const peak = 0.34 * gainScale;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);                        // sharp hammer attack
    amp.gain.exponentialRampToValueAtTime(peak * 0.5, t0 + 0.14);                   // fast initial decay
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 1.1);                  // long sustain tail
    const end = t0 + dur + 1.15;
    oscs.forEach(o => { o.start(t0); o.stop(end); });
    if (this._active) { const e = { oscs, amp }; this._active.add(e); oscs[0].onended = () => this._active && this._active.delete(e); }
  },

  // ── Synth brass — a stack of detuned saws through a resonant low-pass whose
  // envelope "swells" open on attack (the brass blat) then settles, with a touch
  // of delayed vibrato on the sustain.
  _voiceBrass(freq, t0, dur, gainScale = 1) {
    const ctx = this.ctx, out = this.voiceBus || this.master;
    const amp = ctx.createGain();
    const lp  = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4;
    lp.frequency.setValueAtTime(420, t0);
    lp.frequency.linearRampToValueAtTime(Math.min(4600, freq * 6 + 1800), t0 + 0.07);
    lp.frequency.exponentialRampToValueAtTime(Math.max(950, freq * 2.4), t0 + 0.5);
    amp.connect(lp); lp.connect(out);
    const oscs = [];
    [-8, 0, 8].forEach(d => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = d;
      o.connect(amp); oscs.push(o);
    });
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 5.2;
    const lfoG = ctx.createGain(); lfoG.gain.setValueAtTime(0, t0); lfoG.gain.linearRampToValueAtTime(freq * 0.006, t0 + 0.28);
    lfo.connect(lfoG); oscs.forEach(o => lfoG.connect(o.frequency)); oscs.push(lfo);
    const peak = 0.16 * gainScale;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(peak, t0 + 0.055);                             // swell
    amp.gain.setValueAtTime(peak, t0 + dur);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.2);
    const end = t0 + dur + 0.25;
    oscs.forEach(o => { o.start(t0); o.stop(end); });
    if (this._active) { const e = { oscs, amp }; this._active.add(e); oscs[0].onended = () => this._active && this._active.delete(e); }
  },

  // One Rhodes-ish E-piano voice via FM: a sine carrier shaped by a 1:1 "body"
  // modulator plus a high-ratio "tine" modulator that gives the percussive
  // bell attack. Modulation-index envelopes make it bright on attack and warm
  // on sustain — the classic electric-piano character.
  _voiceEP(freq, t0, dur, gainScale = 1) {
    const ctx = this.ctx;
    const carrier = ctx.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = freq;
    const mod  = ctx.createOscillator(); mod.type  = 'sine'; mod.frequency.value  = freq;        // body (ratio 1)
    const tine = ctx.createOscillator(); tine.type = 'sine'; tine.frequency.value = freq * 13;    // bell tine (high ratio)
    const modIdx  = ctx.createGain();  mod.connect(modIdx);   modIdx.connect(carrier.frequency);
    const tineIdx = ctx.createGain();  tine.connect(tineIdx); tineIdx.connect(carrier.frequency);
    const amp = ctx.createGain();
    const lp  = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800; lp.Q.value = 0.4;
    carrier.connect(amp); amp.connect(lp); lp.connect(this.voiceBus || this.master);

    const peak = 0.40 * gainScale;
    modIdx.gain.setValueAtTime(freq * 1.4, t0);
    modIdx.gain.exponentialRampToValueAtTime(freq * 0.35, t0 + 0.5);
    tineIdx.gain.setValueAtTime(freq * 2.2, t0);
    tineIdx.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);     // fast bell decay
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);          // percussive attack
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.7);    // bell-like release

    const end = t0 + dur + 0.75;
    const oscs = [carrier, mod, tine];
    oscs.forEach(o => { o.start(t0); o.stop(end); });
    // Register so Stop can hard-cut every scheduled voice.
    if (this._active) {
      const entry = { oscs, amp };
      this._active.add(entry);
      carrier.onended = () => { if (this._active) this._active.delete(entry); };
    }
  },

  // Immediately silence and stop every musical voice (used by progression Stop).
  killVoices() {
    this._playToken++;
    if (!this.ctx || !this._active) return;
    const now = this.ctx.currentTime;
    this._active.forEach(e => {
      try { e.amp.gain.cancelScheduledValues(now); e.amp.gain.setTargetAtTime(0.0001, now, 0.012); } catch (_) {}
      try { e.oscs.forEach(o => o.stop(now + 0.05)); } catch (_) {}
    });
    this._active.clear();
  },

  // pitches: array of relative semitones (0 = middle C). Tiny strum for life.
  // By default an octave-down copy of the root is added for a fuller voicing;
  // pass addBass=false when the caller already supplies a complete voicing.
  // Premium playback (V6.08): chords breathe. The bass lands ON the beat (through
  // the real electric-bass sampler when it's low enough and loaded); the upper
  // voices strum gently after it with per-note timing jitter (±3ms) and living
  // dynamics (±7% velocity) — the difference between a MIDI block and a take.
  playChord(pitches, dur = 0.95, when = 0, addBass = true) {
    if (!this.resume() || !Array.isArray(pitches) || !pitches.length) return;
    const t0 = this.ctx.currentTime + when;
    const voiced = addBass ? [pitches[0] - 12].concat(pitches) : pitches;
    voiced.forEach((p, i) => {
      const freq = this._freq(p);
      if (i === 0) {
        // Bass voice: exactly on the grid; the real bass takes it whenever the
        // note fits its sampled range (the sampler itself says no otherwise).
        if ((typeof st !== 'object' || st.realPiano !== false) &&
            typeof SampleBass === 'object' && SampleBass.play(freq, t0, dur, 0.85)) return;
        this._voicePiano(freq, t0, dur, 0.7, this.bassBus);   // synth bass on the bass lane too
        return;
      }
      const strum = i * (0.011 + Math.random() * 0.007);        // 11-18ms per step, varies
      const jit   = (Math.random() - 0.5) * 0.006;              // ±3ms micro-timing
      const vel   = 0.9 * (0.93 + Math.random() * 0.14);        // ±7% dynamics
      this._voice(freq, t0 + Math.max(0, strum + jit), dur, vel);
    });
  },

  playNote(pitch, dur = 0.7) {
    if (!this.resume()) return;
    this._voice(this._freq(pitch), this.ctx.currentTime, dur, 1);
  },

  // 808-style sub bass: a clean low sine on `pitch` (auto-dropped two octaves),
  // schedulable; registered so progression Stop also kills it.
  subBass(pitch, when = 0, dur = 0.32) {
    if (!this.resume()) return;
    const ctx = this.ctx, t = when || ctx.currentTime, out = this.voiceBus || this.master;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = this._freq(pitch - 24);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
    if (this._active) { const e = { oscs: [o], amp: g }; this._active.add(e); o.onended = () => this._active && this._active.delete(e); }
  },

  // Play a list of chords (arrays of pitches) in sequence.
  playSequence(chordList, step = 0.62, dur = 0.7) {
    if (!this.resume() || !Array.isArray(chordList) || !chordList.length) return;
    const token = ++this._playToken;
    chordList.forEach((pitches, i) => {
      if (!pitches || !pitches.length) return;
      this.playChord(pitches, dur, i * step);
    });
    return token;
  },

  // DAW-style playback: each entry is { pitches, beats }. Chords are scheduled
  // at their cumulative beat offset and sustained for their own duration, so a
  // 4-beat chord rings four times as long as a 1-beat one. `secPerBeat` comes
  // from the metronome BPM. Returns { token, totalSec } for the playhead.
  // Voice-leading 2.0. Given the previous chord's upper voicing and the new
  // chord's pitch classes, build a smooth voicing:
  //   • anchor the soprano (top voice) near the previous soprano — common tones
  //     are held, otherwise it moves by the smallest step (implicit inversions);
  //   • stack the remaining tones in the octave just below the soprano (closed),
  //     or drop the 2nd-from-top an octave for an open/spread voicing;
  //   • no doubled tones; a low root anchors the bass; register kept in a band.
  // Returns { all, upper } so the next chord leads from `upper`.
  _leadVoicing(prevUpper, pcs, opts = {}) {
    const open = !!(opts.open != null ? opts.open : (typeof st === 'object' && st.voicingOpen));
    const root = ((pcs[0] % 12) + 12) % 12;
    const pcset = [...new Set(pcs.map(p => ((p % 12) + 12) % 12))];        // unique → no doubling
    const prev = (prevUpper && prevUpper.length) ? prevUpper : [0, 4, 7];  // default C E G
    const prevTop = Math.max(...prev);

    // Soprano = the chord tone whose nearest octave is closest to prevTop.
    const near = (pc, target) => { let n = pc; while (n - target > 6) n -= 12; while (target - n > 6) n += 12; return n; };
    let soprano = pcset
      .map(pc => near(pc, prevTop))
      .reduce((best, n) => (Math.abs(n - prevTop) < Math.abs(best - prevTop) ? n : best));

    // Remaining tones sit just below the soprano (within an octave).
    const sopPc = ((soprano % 12) + 12) % 12;
    const below = pcset.filter(pc => pc !== sopPc).map(pc => {
      let n = pc; while (n >= soprano) n -= 12; while (soprano - n > 12) n += 12; return n;
    });
    let notes = [...below, soprano].sort((a, b) => a - b);
    if (open && notes.length >= 3) { notes[notes.length - 2] -= 12; notes.sort((a, b) => a - b); }

    // Register control — keep the body in a comfortable band around middle C.
    const avg = notes.reduce((a, b) => a + b, 0) / notes.length;
    if (avg > 11) notes = notes.map(n => n - 12);
    else if (avg < -3) notes = notes.map(n => n + 12);

    // Bass = the chord root in a steady low register (nearest ~ -9 semitones,
    // roughly C2–B2) so it doesn't drift octave-by-octave through a progression,
    // and always clearly below the voicing (octave doubling ok, unison not).
    let bass = root - 12;
    while (-9 - bass > 6) bass += 12;
    while (bass - (-9) > 6) bass -= 12;
    while (bass > notes[0] - 3) bass -= 12;
    return { all: [bass, ...notes], upper: notes };
  },

  playTimeline(entries, secPerBeat = 0.5, startOffset = 0) {
    if (!this.resume() || !Array.isArray(entries) || !entries.length) return { token: 0, totalSec: 0 };
    const token = ++this._playToken;
    let beatAcc = 0, prevUpper = null;
    entries.forEach(e => {
      const beats = Math.max(0.25, e.beats || 1);
      if (e.pitches && e.pitches.length) {
        const dur = Math.min(2.4, beats * secPerBeat * 0.96);
        const v = this._leadVoicing(prevUpper, e.pitches);   // smooth voice leading
        this.playChord(v.all, dur, startOffset + beatAcc * secPerBeat, false);
        prevUpper = v.upper;
      }
      beatAcc += beats;
    });
    return { token, totalSec: beatAcc * secPerBeat };
  },

  // Schedule a 1-bar (4-beat) metronome count-in starting now. Returns its
  // length in seconds so the caller can delay the music + playhead.
  countIn(secPerBeat = 0.5, beats = 4) {
    if (!this.resume()) return 0;
    const t = this.ctx.currentTime;
    for (let i = 0; i < beats; i++) this.metroClick(i % 4 === 0, t + i * secPerBeat);
    return beats * secPerBeat;
  },

  stop() {
    this._playToken++;
    if (this.ctx) {
      try { this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.02); } catch (_) {}
      setTimeout(() => { try { this.master.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.05); } catch (_) {} }, 80);
    }
  },
};

// Unlock the AudioContext on the first real user gesture. Mobile Chrome/Safari
// keep it suspended until then, which is why audio was silent on the phone.
(function () {
  const unlock = () => { try { AudioEngine.resume(); } catch (_) {} };
  ['pointerdown', 'touchend', 'mousedown', 'keydown'].forEach(ev =>
    document.addEventListener(ev, unlock, { passive: true })
  );
})();

// ── Chord → pitches helpers ───────────────────────────
// Build a triad (relative to middle C) from a chord's root + quality.
function triadIntervals(quality) {
  return quality === 'Min' ? [0, 3, 7] : quality === 'Dim' ? [0, 3, 6] : [0, 4, 7];
}

// Triad, optionally extended to the diatonic seventh when st.sevenths is on.
// The 7th is inferred from quality + Roman degree so V becomes a dominant 7
// (Imaj7 iim7 iiim7 IVmaj7 V7 vim7 viiø7).
function chordIntervalsFor(quality, degree) {
  const tri = triadIntervals(quality);
  if (typeof st !== 'object' || !st.sevenths) return tri;
  const d = String(degree || '').replace(/[^IViv]/g, '').toUpperCase();
  const sev = quality === 'Maj' ? (d === 'V' ? 10 : 11) : 10;   // dom7 vs maj7; min7/ø7 = 10
  return tri.concat(sev);
}

// Pitches for the chord at degree `idx` of the current key/mode (core chord
// tones, no doubling — the octave-down body is added at playback in playChord).
function chordPitchesForDegree(idx) {
  const c = (typeof gc === 'function') && gc()[idx];
  if (!c) return [];
  const root = ni(c.note);
  return chordIntervalsFor(c.quality, c.degree).map(iv => root + iv);
}

// Pitches for a built progression item ({ degreeIndex, quality, note, degree,
// variant }). A per-chord variant ('7','maj7','sus4'…) overrides the default.
function chordPitchesForItem(item) {
  if (!item) return [];
  const root = ni(item.note != null ? item.note : item.chord.replace(/m|°/g, ''));
  const iv = (item.variant && item.variant !== 'triad' && typeof variantDef === 'function')
    ? variantDef(item.quality, item.variant).iv
    : chordIntervalsFor(item.quality, item.degree);
  return iv.map(x => root + x);
}

// ── SAMPLED INSTRUMENTS ───────────────────────────────────────────────────
// Real recordings, lazily fetched from this origin on the first user gesture
// and pitch-shifted from the nearest sample via playbackRate (max ±2 semitones,
// inaudible). The SW keeps them in a persistent cache; the synth voices remain
// the seamless fallback (while loading, offline, file://, out of range, or when
// the user picks Synth in Settings).
//   piano  — Salamander Grand V3 (Yamaha C5) by Alexander Holm, CC-BY 3.0
//   guitar — VSCO2 Community Edition nylon guitar, CC0
const _NOTE_SEMI = { C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5, Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11 };
function _makeSampler(base, names, opts = {}) {
  return {
    BASE: base, NAMES: names,
    gain: opts.gain || 1.1, release: opts.release || 0.45, maxShift: opts.maxShift || 7,
    busName: opts.busName || null,
    buffers: {},                   // midi → AudioBuffer
    state: 'idle',                 // idle | loading | ready(≥1 decoded) | failed

    _midi(name) { return 12 * (+name.slice(-1) + 1) + _NOTE_SEMI[name.slice(0, -1)]; },

    ensure() {
      if (this.state !== 'idle') return;
      if (typeof location !== 'undefined' && location.protocol === 'file:') { this.state = 'failed'; return; }
      if (!AudioEngine.ctx) { return; }                    // resume() calls again once ctx exists
      this.state = 'loading';
      this.NAMES.forEach(n => {
        fetch(this.BASE + n + '.mp3')
          .then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
          .then(ab => AudioEngine.ctx.decodeAudioData(ab))
          .then(buf => { this.buffers[this._midi(n)] = buf; if (this.state === 'loading') this.state = 'ready'; })
          .catch(() => {});
      });
      setTimeout(() => { if (!Object.keys(this.buffers).length) this.state = 'failed'; }, 20000);
    },

    // Schedule one sampled note. Returns false when it can't (→ caller uses synth).
    play(freq, t0, dur, gainScale = 1) {
      if (this.state !== 'ready') return false;
      const ctx = AudioEngine.ctx; if (!ctx) return false;
      const midi = Math.round(60 + 12 * Math.log2(freq / 261.63));
      let best = null, bd = 99;
      for (const k in this.buffers) { const d = Math.abs(k - midi); if (d < bd) { bd = d; best = +k; } }
      if (best == null || bd > this.maxShift) return false;   // out of sampled range → synth
      const src = ctx.createBufferSource();
      src.buffer = this.buffers[best];
      src.playbackRate.value = Math.pow(2, (midi - best) / 12);
      const g = ctx.createGain();
      const peak = this.gain * gainScale;
      g.gain.setValueAtTime(peak, t0);
      g.gain.setValueAtTime(peak, t0 + Math.max(0.05, dur));    // natural decay does the shaping
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + this.release);
      src.connect(g); g.connect((this.busName && AudioEngine[this.busName]) || AudioEngine.voiceBus || AudioEngine.master);
      src.start(t0); src.stop(t0 + dur + this.release + 0.05);
      if (AudioEngine._active) {                             // progression Stop hard-cuts these too
        const e = { oscs: [src], amp: g };
        AudioEngine._active.add(e);
        src.onended = () => AudioEngine._active && AudioEngine._active.delete(e);
      }
      return true;
    },
  };
}

const SamplePiano = _makeSampler('samples/piano/',
  ['C2','Ds2','Fs2','A2','C3','Ds3','Fs3','A3','C4','Ds4','Fs4','A4','C5','Ds5','Fs5','A5','C6'],
  { gain: 1.15 });

const SampleGuitar = _makeSampler('samples/guitar/',
  ['E2','Fs2','A2','B2','Cs3','D3','Fs3','G3','B3','Cs4','E4','Fs4','A4','B4','Cs5','D5','E5'],
  { gain: 1.0, release: 0.6, maxShift: 4 });

// Electric bass (VSCO2 CE, CC0) — the real low end under progressions. The
// voice-led bass note routes here instead of the piano's left hand.
const SampleBass = _makeSampler('samples/bass/',
  ['E1','G1','As1','Cs2','E2','G2','As2','Cs3','E3','G3'],
  { gain: 1.25, release: 0.35, maxShift: 3, busName: 'bassBus' });

// ── Instrument Pack 1 (free in beta; pack-gated, see PACKS) ──
// Steel acoustic (neo-soul strums, singer-songwriter warmth) + clean electric.
const SampleSteel = _makeSampler('samples/steel/',
  ['D2','F2','Gs2','B2','D3','F3','Gs3','B3','D4','F4','Gs4','B4','D5'],
  { gain: 0.95, release: 0.5, maxShift: 4 });
const SampleElectric = _makeSampler('samples/electric/',
  ['A2','C3','Ds3','Fs3','A3','C4','Ds4','Fs4','A4','C5'],
  { gain: 0.85, release: 0.45, maxShift: 4 });

// ── REAL DRUM KITS (Tone.js drum-samples, per genre) ──────────────────────
// kick/snare/hat/tom route through a genre-matched sampled kit when loaded;
// the coloured voices (clap, shaker, rim, ride, cowbell) stay synthesised on
// purpose — they're stylised accents. Fallback is always the synth kit.
const DrumKits = {
  MAP: { house: 'Techno', neosoul: 'LINN', jazz: 'acoustic-kit' },
  PIECES: ['kick', 'snare', 'hihat', 'tom1'],
  TYPE2PIECE: { kick: 'kick', snare: 'snare', hat: 'hihat', tom: 'tom1' },
  kits: {},                                  // kit name → { state, buffers }
  ensure(genre) {
    const kit = this.MAP[genre];
    if (!kit || !AudioEngine.ctx) return;
    if (typeof location !== 'undefined' && location.protocol === 'file:') return;
    const k = this.kits[kit] || (this.kits[kit] = { state: 'idle', buffers: {} });
    if (k.state !== 'idle') return;
    k.state = 'loading';
    this.PIECES.forEach(p => {
      fetch(`samples/drums/${kit}/${p}.mp3`)
        .then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(ab => AudioEngine.ctx.decodeAudioData(ab))
        .then(buf => { k.buffers[p] = buf; k.state = 'ready'; })
        .catch(() => {});
    });
  },
  play(genre, type, t, accent) {
    const kit = this.MAP[genre], k = kit && this.kits[kit];
    if (!k || k.state !== 'ready') return false;
    const piece = this.TYPE2PIECE[type], buf = piece && k.buffers[piece];
    if (!buf) return false;
    const ctx = AudioEngine.ctx;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = (accent ? 1 : 0.72) * (type === 'hat' ? 0.55 : 0.95);
    src.connect(g); g.connect(AudioEngine.drumBus || AudioEngine.master);
    src.start(t);
    return true;
  },
};
