// ── AUDIO ENGINE (V4.1) ───────────────────────────────
// A small, pleasant Web Audio synth: tap a chord to hear it, play the
// progression. Lazily creates the AudioContext on the first user gesture.

const AudioEngine = {
  ctx: null, master: null, wet: null, _playToken: 0,

  _ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { this.ctx = new AC(); } catch (_) { return false; }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.32;
    // A soft reverb tail for a calmer, more "instrument" feel.
    const conv = ctx.createConvolver();
    conv.buffer = this._impulse(1.7, 2.6);
    this.wet = ctx.createGain(); this.wet.gain.value = 0.20;
    this.master.connect(ctx.destination);
    this.master.connect(conv); conv.connect(this.wet); this.wet.connect(ctx.destination);
    return true;
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
    return true;
  },

  ready() { return !!this.ctx; },

  _freq(pitch) { return 261.63 * Math.pow(2, pitch / 12); }, // pitch 0 = middle C

  // One warm voice: two slightly-detuned oscillators through a lowpass + ADSR.
  _voice(freq, t0, dur, gainScale = 1) {
    const ctx = this.ctx;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'triangle'; o2.type = 'sine'; o2.detune.value = 5;
    o1.frequency.value = freq; o2.frequency.value = freq;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.6;
    o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(this.master);
    const peak = 0.42 * gainScale, atk = 0.012, rel = 0.55;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + rel);
    o1.start(t0); o2.start(t0);
    o1.stop(t0 + dur + rel + 0.05); o2.stop(t0 + dur + rel + 0.05);
  },

  // pitches: array of relative semitones (0 = middle C). Tiny strum for life.
  playChord(pitches, dur = 0.95, when = 0) {
    if (!this.resume() || !Array.isArray(pitches) || !pitches.length) return;
    const t0 = this.ctx.currentTime + when;
    pitches.forEach((p, i) => this._voice(this._freq(p), t0 + i * 0.014, dur, 0.9));
  },

  playNote(pitch, dur = 0.7) {
    if (!this.resume()) return;
    this._voice(this._freq(pitch), this.ctx.currentTime, dur, 1);
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

  stop() {
    this._playToken++;
    if (this.ctx) {
      try { this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.02); } catch (_) {}
      setTimeout(() => { try { this.master.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.05); } catch (_) {} }, 80);
    }
  },
};

// ── Chord → pitches helpers ───────────────────────────
// Build a triad (relative to middle C) from a chord's root + quality.
function triadIntervals(quality) {
  return quality === 'Min' ? [0, 3, 7] : quality === 'Dim' ? [0, 3, 6] : [0, 4, 7];
}

// Pitches for the chord at degree `idx` of the current key/mode.
function chordPitchesForDegree(idx) {
  const c = (typeof gc === 'function') && gc()[idx];
  if (!c) return [];
  const root = ni(c.note);                       // 0–11
  return triadIntervals(c.quality).map(iv => root + iv);
}

// Pitches for a built progression item ({ degreeIndex, quality, note }).
function chordPitchesForItem(item) {
  if (!item) return [];
  const root = ni(item.note != null ? item.note : item.chord.replace(/m|°/g, ''));
  return triadIntervals(item.quality).map(iv => root + iv);
}
