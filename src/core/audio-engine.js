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
    this._active = new Set();
    // Drum bus — percussion runs dry (no reverb wash) at its own level.
    this.drumBus = ctx.createGain(); this.drumBus.gain.value = 0.85;
    this.drumBus.connect(this.dry);
    return true;
  },

  // ── 808/909-style drum voices (synthesised, schedulable at `when`) ─────
  drumHit(type, when = 0, accent = false) {
    if (!this.resume()) return;
    const t = when || this.ctx.currentTime;
    const fn = { kick:'_kick', clap:'_clap', snare:'_snare', hat:'_hat', open:'_openhat', shaker:'_shaker', rim:'_rim' }[type];
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

  // ── Karplus-Strong plucked-string voice ───────────────
  // Physical-model synthesis: a noise burst excites a feedback delay loop
  // whose period equals 1/freq. A lowpass filter in the loop damps higher
  // harmonics each cycle, producing the warm, decaying timbre of a plucked
  // guitar string. Only used by playGuitarNote — chord previews use Rhodes.
  _guitarVoice(freq, t0, gainScale) {
    const ctx = this.ctx, out = this.master;
    const sr = ctx.sampleRate;
    // Exactly one period of noise — critical: longer bursts cause harmonic buildup
    const noiseLen = Math.max(2, Math.round(sr / freq));
    const buf = ctx.createBuffer(1, noiseLen, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) d[i] = (Math.random() * 2 - 1) * 0.45;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = false;
    // Delay tuned to string fundamental
    const delay = ctx.createDelay(0.06); delay.delayTime.value = 1 / freq;
    // Tight lowpass — the filter that shapes string brightness (damps harmonics each cycle)
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = Math.min(freq * 2, 2400);
    lp.Q.value = 0.3;
    // Feedback gain — lower = more damping, shorter sustain
    const fb = ctx.createGain(); fb.gain.value = 0.97;
    const decaySec = Math.max(1.4, 3.4 - freq / 500);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gainScale * 0.42, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + decaySec);
    src.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
    delay.connect(amp); amp.connect(out);
    // Stop after exactly one period — prevents inter-cycle buildup
    src.start(t0); src.stop(t0 + noiseLen / sr);
    if (this._active) {
      const entry = { oscs: [src], amp };
      this._active.add(entry);
      const wallMs = Math.max(100, (t0 - ctx.currentTime + decaySec) * 1000);
      setTimeout(() => { if (this._active) this._active.delete(entry); }, wallMs);
    }
  },

  playGuitarNote(pitch) {
    if (!this.resume()) return;
    this._guitarVoice(this._freq(pitch), this.ctx.currentTime, 1);
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

  // One Rhodes-ish voice via FM: a sine carrier shaped by a 1:1 "body"
  // modulator plus a high-ratio "tine" modulator that gives the percussive
  // bell attack. Modulation-index envelopes make it bright on attack and warm
  // on sustain — the classic electric-piano character.
  _voice(freq, t0, dur, gainScale = 1) {
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
  playChord(pitches, dur = 0.95, when = 0, addBass = true) {
    if (!this.resume() || !Array.isArray(pitches) || !pitches.length) return;
    const t0 = this.ctx.currentTime + when;
    const voiced = addBass ? [pitches[0] - 12].concat(pitches) : pitches;
    voiced.forEach((p, i) => this._voice(this._freq(p), t0 + i * 0.014, dur, i === 0 ? 0.7 : 0.9));
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
