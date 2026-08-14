// ── INIT ──────────────────────────────────────────────
// Plasma background, theme, palette, and app bootstrap.

// Plasma WebGL
const PALETTES_DATA = PALETTES;
(function initPlasma() {
  const pc = document.getElementById('plasma');
  const gl = pc ? pc.getContext('webgl', { antialias:false, alpha:false }) : null;
  const hasGL = !!gl;
  if (pc && !hasGL) pc.style.display = 'none';

  let uLoc, tLoc, dLoc, cLoc = [], glOK = false;
  if (hasGL) {
    const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
    // Gentle sine-field plasma (the original's calm flow — no swirls) but blended
    // through 5 colour stops so the whole screen carries more colour & variety.
    // Static (non-interactive) in the app; the interactive version lives on the web.
    const FS = `
      precision mediump float;
      uniform vec2 u; uniform float t; uniform float d; uniform float lm;
      uniform vec3 cA,cB,cC,cD,cE;
      float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 v=gl_FragCoord.xy/u-0.5; v.x*=u.x/u.y;
        float a=sin(v.x*2.6+t*0.55)*sin(v.y*2.3-t*0.42)*0.5+0.5;
        float e=sin(length(v)*3.4-t*0.6)*0.5+0.5;
        float f=sin((v.x+v.y)*2.0+t*0.35)*0.5+0.5;
        float g=sin(v.x*1.7-v.y*1.9+t*0.48)*0.5+0.5;
        vec3 col=mix(cA,cB,a);
        col=mix(col,cC,e*0.85);
        col=mix(col,cD,f*0.7);
        col=mix(col,cE,g*0.5);
        col+=0.04*sin(t*0.8+v.yxx*7.0);                 // shimmer
        col*=1.0-(0.4-0.26*lm)*dot(v,v);                // vignette (gentler in light)
        col+=(h(gl_FragCoord.xy+fract(t))-0.5)*0.012;   // grain (anti-banding)
        // Light theme: lift toward pastel (keeps hue, kills the grey-olive murk)
        col=mix(col, 1.0-(1.0-col)*0.38, lm);
        gl_FragColor=vec4(max(col,0.0)*mix(d, clamp(d*1.9,0.8,1.05), lm),1.0);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    glOK = gl.getProgramParameter(prog, gl.LINK_STATUS);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog,'p');
    gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    uLoc  = gl.getUniformLocation(prog,'u');
    tLoc  = gl.getUniformLocation(prog,'t');
    dLoc  = gl.getUniformLocation(prog,'d');
    cLoc  = ['cA','cB','cC','cD','cE'].map(n => gl.getUniformLocation(prog, n));
    const lmLoc = gl.getUniformLocation(prog, 'lm');
    // Pastel plasma in the light theme; wired to the theme toggle below.
    window._setPlasmaLight = v => { try { gl.uniform1f(lmLoc, v ? 1 : 0); } catch (_) {} };
    window._setPlasmaLight(typeof st === 'object' && st.theme === 'light');
  }

  function hexToVec(hex) {
    return [parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255];
  }

  let currentPal = st.palette || 0;
  function applyPalette(idx) {
    currentPal = idx; st.palette = idx; saveState();
    document.querySelectorAll('.pal-btn').forEach((b,i) => b.classList.toggle('active', i === idx));
    const pal = PALETTES_DATA[idx];
    if (!pal) return;
    // Always update the CSS background tint — this is what makes the palette
    // picker useful even when WebGL is unavailable.
    document.body.style.setProperty('--bg-plasma', pal.bg);
    // Tie the suggestion-bubble accent to the palette's primary colour so the
    // bubbles harmonise with the plasma (colour cohesion).
    const ba = pal.colors && pal.colors[0];
    if (ba) {
      const [r, g, b] = hexToVec(ba).map(v => Math.round(v * 255));
      document.body.style.setProperty('--ba', ba);
      document.body.style.setProperty('--ba-rgb', `${r},${g},${b}`);
    }
    if (hasGL) {
      const cols = (pal.flow || pal.colors).map(hexToVec);
      while (cols.length < 5) cols.push(cols[cols.length - 1]);
      cLoc.forEach((loc, i) => gl.uniform3fv(loc, cols[i]));
    }
  }
  window._setPalActive = applyPalette;

  // Build the palette swatches + intensity slider ALWAYS (decoupled from WebGL),
  // so the background-colour settings never disappear on a graphics hiccup.
  const palRow = document.getElementById('palRow');
  if (palRow && !palRow.querySelector('.pal-btn')) {
    PALETTES_DATA.forEach((pal, i) => {
      const btn = document.createElement('button');
      btn.className = 'pal-btn' + (i === currentPal ? ' active' : '');
      btn.style.background = pal.colors[0];
      btn.title = pal.name;
      btn.onclick = () => applyPalette(i);
      palRow.appendChild(btn);
    });
  }

  // On mobile, render the plasma at a slightly lower internal resolution to
  // save some GPU — but keep full brightness so the background stays dynamic
  // and vivid (the earlier 0.6x/0.72x made it look like a flat colour).
  const mobileBg = matchMedia('(max-width: 860px)').matches;
  // Adaptive resolution: low-memory devices start low; sustained jank steps it
  // down further (see the loop). The background must never cost the UI its fps.
  let resScale = mobileBg ? 0.85 : 1;
  if ((navigator.deviceMemory || 8) <= 2) resScale = Math.min(resScale, 0.6);
  const dimFactor = 1;

  let intensity = parseFloat(st.intensity) || 1;
  const setIntensity = () => { if (hasGL) gl.uniform1f(dLoc, intensity * 0.52 * dimFactor); };

  const intensityEl = document.getElementById('plasmaIntensity');
  if (intensityEl) {
    intensityEl.value = intensity;
    intensityEl.addEventListener('input', () => {
      intensity = parseFloat(intensityEl.value) || 1;
      st.intensity = intensity; saveState(); setIntensity();
    });
  }

  applyPalette(currentPal);
  // No GL (or the shader failed to compile/link on this GPU) → hide the canvas so
  // the CSS --bg-plasma tint shows through instead of a black rectangle. Palette &
  // intensity UI stay usable.
  if (!hasGL || !glOK) { if (pc) pc.style.display = 'none'; return; }

  function resize() {
    pc.width  = Math.round(innerWidth  * resScale);
    pc.height = Math.round(innerHeight * resScale);
    gl.viewport(0,0,pc.width,pc.height);
    gl.uniform2f(uLoc, pc.width, pc.height);
  }
  window.addEventListener('resize', resize, {passive:true}); resize();
  setIntensity();

  // On mobile, render at ~30fps (skip every other frame) and pause while the
  // page is scrolling or hidden. Desktop stays at full rate. No pointer input —
  // the app background is purely ambient; interactivity lives on the web landing.
  let tVal = 0, frame = 0, scrolling = 0;
  if (mobileBg) {
    addEventListener('scroll', () => { scrolling = performance.now(); }, { passive: true });
  }

  const drawOnce = () => { tVal += 0.014; gl.uniform1f(tLoc, tVal); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };

  // Reduced motion: one beautiful static frame, no animation loop at all.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawOnce();
    window.__plasma = { mode: 'static-reduced', scale: resScale };
    return;
  }

  // Degrade ladder against sustained jank (EMA of frame gaps):
  //   level 0 full → level 1 drop to 0.6 res → level 2 freeze (static frame).
  // The plasma is ambience; a low-end phone gets its CPU/GPU back for the music.
  let degradeLvl = 0, ema = 16.7, lastT = performance.now(), settle = 0;
  window.__plasma = { mode: 'animated', scale: resScale, level: 0 };
  const degrade = () => {
    degradeLvl++;
    if (degradeLvl === 1) { resScale = Math.min(resScale, 0.6); resize(); }
    window.__plasma = { mode: degradeLvl >= 2 ? 'frozen' : 'animated', scale: resScale, level: degradeLvl };
  };
  window.__plasmaDegrade = degrade;                 // test hook (also handy in devtools)

  (function loop() {
    if (degradeLvl >= 2) return;                    // frozen: last frame stays, loop ends
    frame++;
    const nowT = performance.now();
    const dt = Math.min(200, nowT - lastT); lastT = nowT;
    ema = ema * 0.95 + dt * 0.05;
    // Give each level ~2s to settle before judging it.
    if (++settle > 120 && ema > 26) { degrade(); settle = 0; ema = 16.7; }
    const midScroll = mobileBg && nowT - scrolling < 120;
    const draw = !midScroll && (!mobileBg || frame % 2 === 0);
    if (draw) {
      tVal += mobileBg ? 0.028 : 0.014;
      gl.uniform1f(tLoc, tVal);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    requestAnimationFrame(loop);
  })();
})();

function toggleTheme() {
  const apply = () => {
    isLight = !isLight;
    st.theme = isLight ? 'light' : 'dark';
    document.body.classList.toggle('light', isLight);
    const btn = document.getElementById('themeBtn');
    if (btn) setIcon(btn, isLight ? 'moon' : 'sun');
    if (typeof window._setPlasmaLight === 'function') window._setPlasmaLight(isLight);
    saveState();
    renderWheel();
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Radial wipe from the theme button via the View Transitions API (graceful
  // fallback to an instant switch where it's unsupported).
  if (!document.startViewTransition || reduce) { apply(); return; }
  const btn = document.getElementById('settingsBtn');
  const r = btn?.getBoundingClientRect();
  document.documentElement.style.setProperty('--vt-x', (r ? r.left + r.width / 2 : innerWidth - 40) + 'px');
  document.documentElement.style.setProperty('--vt-y', (r ? r.top + r.height / 2 : 40) + 'px');
  document.startViewTransition(apply);
}

// App boot
(function init() {
  MobileOptimizer.init();
  // Restore a shared progression from the URL hash before the first render.
  const _sharedLoop = (typeof applyShareFromURL === 'function') && applyShareFromURL();
  // Single source of truth for the version (badge + title derive from APP_VERSION).
  const verEl = document.querySelector('.version');
  if (verEl) verEl.textContent = APP_VERSION;
  document.title = 'Quinta · ' + APP_VERSION;
  document.body.classList.toggle('light', isLight);
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) setIcon(themeBtn, isLight ? 'moon' : 'sun');

  if (window._setPalActive) window._setPalActive(st.palette || 0);

  const sel = document.getElementById('modeSelect');
  if (sel) {
    sel.innerHTML = MODE_ORDER.map(id => {
      const f = modeFriendly(id);
      return `<option value="${id}">${f[0]} · ${f[1]}</option>`;
    }).join('');
    sel.onchange = e => AppActions.setMode(e.target.value);
  }

  const langSel = document.getElementById('langSelect');
  if (langSel) langSel.value = st.lang || 'en';

  // Tick ring
  const tg = document.getElementById('ticks');
  if (tg) {
    tg.innerHTML = '';
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * Math.PI / 180;
      const r1 = i % 5 === 0 ? 157 : 163, r2 = 168;
      const l = se('line', {
        x1: 300 + r1 * Math.cos(a), y1: 300 + r1 * Math.sin(a),
        x2: 300 + r2 * Math.cos(a), y2: 300 + r2 * Math.sin(a),
        stroke: isLight ? 'rgba(20,20,20,.12)' : 'rgba(255,255,255,.1)',
        'stroke-width': '.6',
      });
      tg.appendChild(l);
    }
  }

  initWheelRoulette();
  initWheelLock();
  WheelDirectionGuide.addInfoButton();
  if (typeof Metronome === 'object') Metronome.init();
  initPlayOpts();

  normalizeKeyState();
  // Build is the default mode: it is where 80% of real use happens. Explore is
  // one tap away for anyone who wants the wheel first.
  document.body.dataset.mode = 'build';
  document.body.dataset.tab  = 'theory';     // legacy flag (instrument dock, section dots)
  RenderEngine.full();
  const _ctx = document.getElementById('ctxBar'); if (_ctx) _ctx.hidden = false;
  applyI18n();
  applyIcons();   // inject the line-SVG icon set
  if (typeof TransportSheet === 'object') TransportSheet.init();
  // Lift the metronome to body level: .app has position:relative + z-index, so it
  // creates a stacking context that traps #metronome (z-index 9000) BELOW the
  // transport island (a body-level sibling). On mobile that made the metronome
  // panel open hidden behind the island. It's position:fixed, so relocating it
  // doesn't change where it appears — only which stacking context it lives in.
  const _metro = document.getElementById('metronome');
  if (_metro && _metro.parentElement !== document.body) document.body.appendChild(_metro);
  _syncVoiceUI();   // reflect the saved instrument sound
  initBuilderFocus();     // scroll → builder fills the screen
  initTabbarMinimise();   // scroll → the tab capsule stands down
  initTabbarScrub();      // hold → steer the capsule with the thumb
  _wireMetroSwipe();      // slide the metronome right → tuner
  tel('app_open');
  st.visits = (st.visits || 0) + 1; saveState();          // install nudge waits for visit 2+
  setTimeout(() => { try { _maybeInstallNudge(); } catch (_) {} }, 3200);

  // Boot complete → fade the splash out (the template has a 4s failsafe too).
  const _splash = document.getElementById('splash');
  if (_splash) setTimeout(() => {
    _splash.classList.add('done');
    setTimeout(() => { try { _splash.remove(); } catch (_) {} }, 600);
  }, 120);

  // Opened from a shared link → invite them to play the loop (audio needs the tap).
  if (_sharedLoop) {
    setTimeout(showSharedBanner, 420);
  } else if (typeof Onboarding === 'object' && Onboarding.shouldShow()) {
    // First-run welcome tour (once; re-openable from the header "?" button).
    setTimeout(() => Onboarding.open(), 520);
  } else if (typeof Comeback === 'object') {
    // Returning visitor: their projects + today's challenge. Once per day, from
    // the 2nd visit on, and never on top of the tour or a shared loop.
    setTimeout(() => { try { Comeback.maybeShow(); } catch (_) {} }, 700);
  }
})();

// ── PWA INSTALL NUDGE + OFFLINE PILL ──────────────────
// A gentle, dismissible invitation to install — only for returning visitors
// (2nd+ visit), never inside an already-installed app. Chrome/Android use the
// native prompt; iOS gets a one-time "how to" hint (no prompt API there).
let _a2hs = null;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _a2hs = e;
  _maybeInstallNudge();
});
addEventListener('appinstalled', () => { tel('installed'); _hideInstallNudge(); });

function _standalone() {
  return (matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}
function _maybeInstallNudge() {
  if (_standalone() || st.installDismissed) return;
  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);
  if (_a2hs && (st.visits || 0) >= 2) _showInstallNudge(false);
  else if (isIOS && (st.visits || 0) >= 3) _showInstallNudge(true);
}
function _showInstallNudge(ios) {
  if (document.getElementById('installNudge')) return;
  const el = document.createElement('div');
  el.id = 'installNudge'; el.className = 'install-nudge';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <img class="in-ico" src="icons/favicon.png" alt="" width="30" height="30"/>
    <div class="in-text">
      <div class="in-title">${t('install.title')}</div>
      <div class="in-sub">${ios ? t('install.ios') : t('install.sub')}</div>
    </div>
    ${ios ? '' : `<button class="in-btn" data-act="install.accept">${t('install.btn')}</button>`}
    <button class="in-x" data-ico="close" data-ico-size="12" data-act="install.dismiss" aria-label="Dismiss"></button>`;
  document.body.appendChild(el);
  applyIcons(el);
  requestAnimationFrame(() => el.classList.add('show'));
  tel('install_prompt_shown', { ios: !!ios });
}
function _acceptInstall() {
  if (!_a2hs) return _hideInstallNudge();
  _a2hs.prompt();
  _a2hs.userChoice.then(c => { tel(c.outcome === 'accepted' ? 'install_accepted' : 'install_declined'); });
  _a2hs = null;
  _hideInstallNudge();
}
function _dismissInstall() {
  st.installDismissed = true; saveState();
  tel('install_dismissed');
  _hideInstallNudge();
}
function _hideInstallNudge() {
  const el = document.getElementById('installNudge');
  if (el) { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }
}

// Offline pill — a quiet "you're offline (everything still works)" indicator.
(function offlinePill() {
  let el = null;
  const sync = () => {
    const off = !navigator.onLine;
    if (off && !el) {
      el = document.createElement('div');
      el.className = 'offline-pill';
      el.setAttribute('role', 'status');
      el.textContent = t('offline.pill');
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
    } else if (!off && el) {
      el.classList.remove('show');
      const dead = el; el = null;
      setTimeout(() => dead.remove(), 350);
    }
  };
  addEventListener('online', sync); addEventListener('offline', sync);
  if (!navigator.onLine) setTimeout(sync, 800);
})();

// Slide the metronome capsule to the right and the tuner opens (V6.33). A
// horizontal drag, decided early: >36px of x-travel with x clearly dominating
// y arms it; anything else falls through to the metronome's own taps.
function _wireMetroSwipe() {
  // "El metrónomo" is two elements: the top bubble on desktop, and the
  // transport accessory capsule on phones (the BPM lives there). Wire both.
  const targets = [document.getElementById('metronome'), document.querySelector('.ts-cap')].filter(Boolean);
  targets.forEach(m => {
    if (m._tunerWired) return;
    m._tunerWired = true;
    let sx = 0, sy = 0, live = false, fired = false;
    m.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; live = true; fired = false; }, { passive: true });
    m.addEventListener('pointermove', e => {
      if (!live) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (dx > 36 && dx > Math.abs(dy) * 1.6) { live = false; fired = true; haptic('ok'); Tuner.open(); }
    }, { passive: true });
    ['pointerup', 'pointercancel'].forEach(t => m.addEventListener(t, () => { live = false; }, { passive: true }));
    // The click that follows the swipe is not a second intent — without this it
    // would also open the transport island / metronome panel over the tuner.
    m.addEventListener('click', e => {
      if (fired) { fired = false; e.stopPropagation(); e.preventDefault(); }
    }, true);
  });
}

// The section-dots rail (V5.x–V6.31) died with the single long page: it jumped
// between Wheel · Chords · Builder when they shared one scroll. Those are three
// TABS now, and the rail floated over every one of them pointing at sections
// that were no longer there.
