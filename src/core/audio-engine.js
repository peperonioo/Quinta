// ── AUDIO ENGINE (V4.1) ───────────────────────────────
// A small, pleasant Web Audio synth: tap a chord to hear it, play the
// progression. Lazily creates the AudioContext on the first user gesture.

const AudioEngine = {
  ctx: null, master: null, wet: null, _playToken: 0, _iosEl: null,

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
    if (this._iosEl) { try { this._iosEl.play(); } catch (_) {} }
    return true;
  },

  ready() { return !!this.ctx; },

  // A short percussive blip — used as the wheel "tick" on each key crossing.
  tick(freq = 1150, vol = 0.16) {
    if (!this.resume()) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = ctx.createGain();
    o.connect(g); g.connect(this.master);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    o.start(t0); o.stop(t0 + 0.08);
  },

  // Classic analog-metronome click, schedulable at an exact time. Beat 1 is
  // accented (brighter, louder) like a real mechanical metronome.
  metroClick(accent, when) {
    if (!this.resume()) return;
    const ctx = this.ctx, t0 = when != null ? when : ctx.currentTime;
    // mechanical click = short noise burst through a bandpass
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 8);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = accent ? 2700 : 1950; bp.Q.value = 1.1;
    const ng = ctx.createGain(); ng.gain.value = accent ? 0.5 : 0.34;
    src.connect(bp); bp.connect(ng); ng.connect(this.master);
    src.start(t0);
    // a pitched body so it reads as a "tock"
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.value = accent ? 2050 : 1550;
    const og = ctx.createGain(); o.connect(og); og.connect(this.master);
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(accent ? 0.32 : 0.2, t0 + 0.001);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    o.start(t0); o.stop(t0 + 0.06);
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
    carrier.connect(amp); amp.connect(lp); lp.connect(this.master);

    const peak = 0.40 * gainScale;
    modIdx.gain.setValueAtTime(freq * 1.4, t0);
    modIdx.gain.exponentialRampToValueAtTime(freq * 0.35, t0 + 0.5);
    tineIdx.gain.setValueAtTime(freq * 2.2, t0);
    tineIdx.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);     // fast bell decay
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);          // percussive attack
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.7);    // bell-like release

    const end = t0 + dur + 0.75;
    [carrier, mod, tine].forEach(o => { o.start(t0); o.stop(end); });
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

  // DAW-style playback: each entry is { pitches, beats }. Chords are scheduled
  // at their cumulative beat offset and sustained for their own duration, so a
  // 4-beat chord rings four times as long as a 1-beat one. `secPerBeat` comes
  // from the metronome BPM. Returns { token, totalSec } for the playhead.
  playTimeline(entries, secPerBeat = 0.5) {
    if (!this.resume() || !Array.isArray(entries) || !entries.length) return { token: 0, totalSec: 0 };
    const token = ++this._playToken;
    let beatAcc = 0;
    entries.forEach(e => {
      const beats = Math.max(0.25, e.beats || 1);
      if (e.pitches && e.pitches.length) {
        const dur = Math.min(2.4, beats * secPerBeat * 0.96);
        this.playChord(e.pitches, dur, beatAcc * secPerBeat);
      }
      beatAcc += beats;
    });
    return { token, totalSec: beatAcc * secPerBeat };
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
