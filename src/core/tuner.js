// ── GUITAR TUNER (V6.33) ──────────────────────────────
// Slide the metronome to the right and this opens. Mic → autocorrelation →
// cents against the nearest string of standard tuning. As simple as a tuner
// can be: one big note, one needle, six string dots.
//
// Precision comes from the detector, so the detector is pure and unit-tested
// against synthesized sines (dev tests feed it 82.41Hz and expect 82.41Hz).
// Method: normalized time-domain autocorrelation with a silence gate, edge
// trim, and parabolic interpolation around the peak — sub-sample period
// resolution, which at guitar frequencies is well under one cent.
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
  let _smooth = null;   // exponential smoothing of cents, so the needle is calm

  // ── the detector (pure) ─────────────────────────────
  function detect(b, sr) {
    const N = b.length;
    let rms = 0;
    for (let i = 0; i < N; i++) rms += b[i] * b[i];
    rms = Math.sqrt(rms / N);
    if (rms < 0.008) return -1;                       // silence gate

    // Trim quiet edges (attack/decay transients bias the correlation).
    const thr = 0.2;
    let r1 = 0, r2 = N - 1;
    for (let i = 0; i < N / 2; i++) if (Math.abs(b[i]) < thr) { r1 = i; break; }
    for (let i = 1; i < N / 2; i++) if (Math.abs(b[N - i]) < thr) { r2 = N - i; break; }
    const s = b.slice(r1, r2), M = s.length;
    if (M < 256) return -1;

    const c = new Float32Array(M);
    for (let lag = 0; lag < M; lag++) {
      let sum = 0;
      for (let j = 0; j < M - lag; j++) sum += s[j] * s[j + lag];
      c[lag] = sum;
    }
    // Walk past the zero-lag peak, then take the global max after it.
    let d = 0;
    while (d + 1 < M && c[d] > c[d + 1]) d++;
    let maxv = -1, T = -1;
    for (let i = d; i < M; i++) if (c[i] > maxv) { maxv = c[i]; T = i; }
    if (T <= 0 || T + 1 >= M) return -1;
    // Parabolic interpolation around the peak → sub-sample period.
    const x1 = c[T - 1], x2 = c[T], x3 = c[T + 1];
    const a = (x1 + x3 - 2 * x2) / 2, bq = (x3 - x1) / 2;
    const Ti = a ? T - bq / (2 * a) : T;
    const f = sr / Ti;
    return (f > 55 && f < 700) ? f : -1;              // guitar range, with headroom
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

  function _paint(f) {
    const p = el(); if (!p) return;
    const note = p.querySelector('.tn-note'), cts = p.querySelector('.tn-cents'),
          ndl = p.querySelector('.tn-needle'), hint = p.querySelector('.tn-hint');
    if (f < 0) {
      _smooth = null;
      note.textContent = '–';
      cts.textContent = '';
      ndl.style.setProperty('--c', 0); p.classList.remove('in-tune');
      hint.textContent = st.lang === 'es' ? 'Toca una cuerda…' : 'Play a string…';
      p.querySelectorAll('.tn-str').forEach(x => x.classList.remove('on'));
      return;
    }
    const target = nearestString(f);
    let c = Math.max(-50, Math.min(50, cents(f, target.f)));
    _smooth = _smooth === null ? c : _smooth * 0.72 + c * 0.28;
    c = _smooth;
    const inTune = Math.abs(c) <= 3;
    note.textContent = target.n;
    cts.textContent = `${c > 0 ? '+' : ''}${c.toFixed(0)}¢`;
    ndl.style.setProperty('--c', c);
    p.classList.toggle('in-tune', inTune);
    hint.textContent = inTune ? (st.lang === 'es' ? 'afinada ✓' : 'in tune ✓')
      : (c < 0 ? (st.lang === 'es' ? 'sube' : 'tune up') : (st.lang === 'es' ? 'baja' : 'tune down'));
    p.querySelectorAll('.tn-str').forEach(x =>
      x.classList.toggle('on', x.dataset.f === String(target.f)));
  }

  function _tick() {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(buf);
    _paint(detect(buf, ctx.sampleRate));
    raf = requestAnimationFrame(_tick);
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
      analyser.fftSize = 2048;
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

  return { open, close, start, isOpen, STRINGS, _detect: detect };
})();
