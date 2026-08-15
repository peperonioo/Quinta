// ── GUITAR TUNER (V6.33) ──────────────────────────────
// Slide the metronome to the right and this opens. Mic → autocorrelation →
// cents against the nearest string of standard tuning. As simple as a tuner
// can be: one big note, one needle, six string dots.
//
// Precision comes from the detector (MPM — see below), and the detector is
// pure and unit-tested against REALISTIC signals: harmonic-rich strings, the
// missing-fundamental phone-mic case, detuned strings, decaying plucks, noise.
// Pure sines alone once said this tuner was fine while it octave-erred on a
// real guitar ("va muy mal") — never again.
const Tuner = (() => {
  // Standard tuning, low to high. The needle always measures against the
  // NEAREST string: a tuner should tell you how far this string is, not which
  // abstract note you are near.
  const STRINGS = [
    { n: 'E', oct: 2, f: 82.4069 }, { n: 'A', oct: 2, f: 110.0000 },
    { n: 'D', oct: 3, f: 146.8324 }, { n: 'G', oct: 3, f: 195.9977 },
    { n: 'B', oct: 3, f: 246.9417 }, { n: 'E', oct: 4, f: 329.6276 },
  ];

  let stream = null, ctx = null, analyser = null, raf = 0, buf = null;
  let _smooth = null;      // exponential smoothing of cents, so the needle is calm
  let _skip = false;       // detect every 2nd frame — 8192-pt FFTs at 60fps is vanity
  let _ring = [];          // last valid readings → median kills single-frame outliers
  let _lockedF = 0;        // manual string lock (0 = auto)
  let _shownStr = null, _strVotes = 0;   // auto string hysteresis
  let _lastGoodAt = 0;     // display hold: brief dropouts don't blank the needle
  const CLARITY_GATE = 0.8, HOLD_MS = 700;

  // ── the detector (pure) ─────────────────────────────
  // V6.38 — rewritten as MPM (McLeod Pitch Method) after the field report "va
  // muy mal". The old detector picked the tallest autocorrelation peak; a real
  // string through a phone mic has harmonics STRONGER than the fundamental
  // (phone mics also high-pass the lows — on the low E the 82Hz fundamental
  // barely arrives at all), so the tallest peak is routinely the wrong octave.
  // MPM normalizes (NSDF) and then takes the FIRST peak within 90% of the best
  // — the standard fix for octave errors. ACF is computed via FFT (O(N log N),
  // zero-padded to stay linear), because the naive O(N²) at the 4096 window a
  // low E needs would burn a phone core.
  function _fft(re, im, inv) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {          // bit-reversal permutation
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr;
                   const ti = im[i]; im[i] = im[j]; im[j] = ti; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (inv ? 2 : -2) * Math.PI / len;
      const wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const j = i + k, m = i + k + len / 2;
          const xr = re[m] * cr - im[m] * ci, xi = re[m] * ci + im[m] * cr;
          re[m] = re[j] - xr; im[m] = im[j] - xi;
          re[j] += xr;        im[j] += xi;
          const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }

  // → { f, clarity } · f = -1 when there is nothing trustworthy to report.
  function detect(b, sr) {
    const N = b.length;
    let mean = 0; for (let i = 0; i < N; i++) mean += b[i];
    mean /= N;
    let rms = 0;
    const x = new Float64Array(N);
    for (let i = 0; i < N; i++) { x[i] = b[i] - mean; rms += x[i] * x[i]; }
    rms = Math.sqrt(rms / N);
    if (rms < 0.005) return { f: -1, clarity: 0 };          // silence gate

    // Linear ACF via FFT: zero-pad to 2N so lags do not wrap around.
    const P = 2 * N;
    const re = new Float64Array(P), im = new Float64Array(P);
    re.set(x);
    _fft(re, im, false);
    for (let i = 0; i < P; i++) { const p = re[i] * re[i] + im[i] * im[i]; re[i] = p; im[i] = 0; }
    _fft(re, im, true);
    const acf = re;                                          // acf[τ] for τ < N

    // m(τ) = Σ x²[j] + x²[j+τ] over the overlap — O(N) via a prefix sum.
    const sq = new Float64Array(N + 1);
    for (let i = 0; i < N; i++) sq[i + 1] = sq[i] + x[i] * x[i];
    const total = sq[N];

    // NSDF, and MPM peak picking over the guitar range.
    const tMin = Math.max(2, Math.floor(sr / 700)), tMax = Math.min(N - 2, Math.ceil(sr / 55));
    const nsdf = new Float64Array(tMax + 2);
    for (let t = tMin - 1; t <= tMax + 1; t++) {
      const m = (sq[N - t] - 0) + (total - sq[t]);
      nsdf[t] = m > 1e-12 ? (2 * acf[t]) / m : 0;
    }
    // Local maxima between positive-going zero crossings.
    const peaks = [];
    let t = tMin;
    while (t <= tMax && nsdf[t] > 0) t++;                    // leave the lag-0 lobe
    while (t <= tMax) {
      while (t <= tMax && nsdf[t] <= 0) t++;                 // find rise above zero
      let best = -1, bestT = -1;
      while (t <= tMax && nsdf[t] > 0) {
        if (nsdf[t] > best) { best = nsdf[t]; bestT = t; }
        t++;
      }
      if (bestT > 0) peaks.push([bestT, best]);
    }
    if (!peaks.length) return { f: -1, clarity: 0 };
    const nmax = Math.max(...peaks.map(p => p[1]));
    if (nmax < 0.5) return { f: -1, clarity: nmax };         // no periodicity worth trusting
    // FIRST peak within 90% of the best — this is what kills octave errors.
    const K = 0.9;
    const [T] = peaks.find(p => p[1] >= K * nmax);
    // Parabolic interpolation for sub-sample period.
    const x1 = nsdf[T - 1], x2 = nsdf[T], x3 = nsdf[T + 1];
    const a = (x1 + x3 - 2 * x2) / 2, bq = (x3 - x1) / 2;
    const Ti = a ? T - bq / (2 * a) : T;
    const f = sr / Ti;
    return (f > 55 && f < 700) ? { f, clarity: nmax } : { f: -1, clarity: 0 };
  }

  function nearestString(f) {
    let best = STRINGS[0], bd = Infinity;
    for (const st of STRINGS) {
      const d = Math.abs(Math.log2(f / st.f));
      if (d < bd) { bd = d; best = st; }
    }
    return best;
  }
  const cents = (f, target) => 1200 * Math.log2(f / target);

  // ── UI ──────────────────────────────────────────────
  const el = () => document.getElementById('tunerPanel');

  function _blank(p) {
    _smooth = null; _ring.length = 0; _shownStr = null; _strVotes = 0;
    p.querySelector('.tn-note').textContent = '–';
    p.querySelector('.tn-cents').textContent = '';
    p.querySelector('.tn-needle').style.setProperty('--c', 0);
    p.classList.remove('in-tune');
    _setHint(_es() ? 'Toca una cuerda…' : 'Play a string…');
    if (!_lockedF) p.querySelectorAll('.tn-str').forEach(x => x.classList.remove('on'));
  }

  function _paint(r) {
    const p = el(); if (!p) return;
    const now = performance.now();
    const good = r.f > 0 && r.clarity >= CLARITY_GATE;
    if (!good) {
      // Display hold: a string's decay dips under the gate between beats of the
      // needle — blanking instantly made the tuner feel broken. Hold briefly.
      if (now - _lastGoodAt > HOLD_MS) _blank(p);
      return;
    }
    _lastGoodAt = now;
    // Median of the recent window: one bad frame cannot yank the needle.
    _ring.push(r.f); if (_ring.length > 5) _ring.shift();
    const f = [..._ring].sort((a, b) => a - b)[_ring.length >> 1];

    // Which string: manual lock wins; auto needs 4 consecutive agreeing frames
    // to SWITCH — the needle must not flip targets mid-tuning.
    let target = _lockedF ? STRINGS.find(x => x.f === _lockedF) : nearestString(f);
    if (!_lockedF) {
      if (_shownStr && target.f !== _shownStr.f) {
        if (++_strVotes < 4) target = _shownStr; else { _shownStr = target; _strVotes = 0; }
      } else { _shownStr = target; _strVotes = 0; }
    }

    let c = Math.max(-50, Math.min(50, cents(f, target.f)));
    _smooth = _smooth === null ? c : _smooth * 0.72 + c * 0.28;
    c = _smooth;
    const inTune = Math.abs(c) <= 3;
    p.querySelector('.tn-note').textContent = target.n;
    p.querySelector('.tn-cents').textContent = `${c > 0 ? '+' : ''}${c.toFixed(0)}¢`;
    p.querySelector('.tn-needle').style.setProperty('--c', c);
    p.classList.toggle('in-tune', inTune);
    _setHint(inTune ? (_es() ? 'afinada ✓' : 'in tune ✓')
      : (c < 0 ? (_es() ? 'sube' : 'tune up') : (_es() ? 'baja' : 'tune down')));
    p.querySelectorAll('.tn-str').forEach(x =>
      x.classList.toggle('on', x.dataset.f === String(target.f)));
  }

  function _tick() {
    if (!analyser) return;
    _skip = !_skip;
    if (!_skip) {
      analyser.getFloatTimeDomainData(buf);
      _paint(detect(buf, ctx.sampleRate));
    }
    raf = requestAnimationFrame(_tick);
  }

  // Tap a string dot to LOCK the target (old strings can read closer to the
  // neighbour string than to themselves — auto-pick then steers you wrong).
  // Tap the locked dot again for auto.
  function lockString(f) {
    _lockedF = _lockedF === f ? 0 : f;
    _ring.length = 0; _smooth = null;
    const p = el(); if (!p) return;
    p.classList.toggle('str-locked', !!_lockedF);
    p.querySelectorAll('.tn-str').forEach(x =>
      x.classList.toggle('locked', x.dataset.f === String(_lockedF)));
    haptic('sel');
  }

  // ── mic lifecycle ───────────────────────────────────
  // The prompt is precious: browsers only show it for a request made in direct
  // response to a tap, and iOS is strict about it — the auto-request on open
  // could lose that context and fail SILENTLY with the permission still in
  // 'prompt' (measured: hint shown, no dialog, no way to retry). So the mic
  // button is always there until we are actually listening: a manual, tap-bound
  // path that can always re-trigger the prompt.
  const _es = () => st.lang === 'es';
  function _setHint(msg) { const h = el()?.querySelector('.tn-hint'); if (h) h.textContent = msg; }
  function _micBtn(show, label) {
    const b = el()?.querySelector('.tn-mic'); if (!b) return;
    b.hidden = !show;
    if (label) b.textContent = label;
  }

  async function start() {
    const p = el(); if (!p) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      _micBtn(false);
      _setHint(_es() ? 'Este navegador no permite usar el micrófono aquí (¿app instalada con iOS antiguo?). Ábrelo en Safari/Chrome.'
                     : 'This browser cannot use the microphone here (old-iOS installed app?). Open it in Safari/Chrome.');
      return;
    }
    _setHint(_es() ? 'Pidiendo micrófono…' : 'Requesting microphone…');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;   // a low E needs the longer window
      src.connect(analyser);
      buf = new Float32Array(analyser.fftSize);
      _smooth = null;
      _micBtn(false);
      tel('tuner_mic', { ok: true });
      _tick();
    } catch (err) {
      tel('tuner_mic', { ok: false, err: String(err && err.name) });
      // Distinguish "you dismissed/it never asked" from "hard-denied": a hard
      // denial cannot be re-prompted, only fixed in the browser's site settings.
      let denied = false;
      try { denied = (await navigator.permissions.query({ name: 'microphone' })).state === 'denied'; } catch (_) {}
      if (denied) {
        _micBtn(true, _es() ? 'Reintentar' : 'Retry');
        _setHint(_es()
          ? 'Micrófono bloqueado para este sitio. iPhone: Ajustes → Safari → Micrófono (o el menú “ᴀA” → Ajustes del sitio). Android: el candado de la barra → Permisos.'
          : 'Microphone is blocked for this site. iPhone: Settings → Safari → Microphone (or the “aA” menu → Website Settings). Android: the padlock in the bar → Permissions.');
      } else {
        _micBtn(true, _es() ? 'Activar micrófono' : 'Enable microphone');
        _setHint(_es() ? 'Toca el botón — el navegador te pedirá permiso.'
                       : 'Tap the button — the browser will ask for permission.');
      }
    }
  }

  function open() {
    const p = el(); if (!p) return;
    p.hidden = false;
    document.body.classList.add('tuner-open');
    tel('tuner_open', {});
    if (typeof OverlayManager === 'object') OverlayManager.opened('tuner');
    _micBtn(true, _es() ? 'Activar micrófono' : 'Enable microphone');
    // Try immediately too — where the gesture context survives (Android,
    // desktop) this prompts or connects with zero extra taps.
    start();
  }

  function close() {
    const p = el(); if (p) { p.hidden = true; _micBtn(true); }
    document.body.classList.remove('tuner-open');
    cancelAnimationFrame(raf); raf = 0;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    analyser = null;
  }

  function isOpen() { return !!el() && !el().hidden; }

  return { open, close, start, isOpen, lockString, STRINGS, _detect: detect };
})();
