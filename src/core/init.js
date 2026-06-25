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
      uniform vec2 u; uniform float t; uniform float d;
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
        col*=1.0-0.4*dot(v,v);                          // vignette
        col+=(h(gl_FragCoord.xy+fract(t))-0.5)*0.012;   // grain (anti-banding)
        gl_FragColor=vec4(max(col,0.0)*d,1.0);
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
  const resScale = mobileBg ? 0.85 : 1;
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
  (function loop() {
    frame++;
    const midScroll = mobileBg && performance.now() - scrolling < 120;
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
    if (btn && typeof setIcon === 'function') setIcon(btn, isLight ? 'moon' : 'sun');
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
  if (themeBtn && typeof setIcon === 'function') setIcon(themeBtn, isLight ? 'moon' : 'sun');

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

  document.querySelectorAll('.genre-btn').forEach(b =>
    b.classList.toggle('active', (b.textContent.trim().toLowerCase().replace(' ','')) === curGenre)
  );

  initWheelRoulette();
  if (typeof initWheelLock === 'function') initWheelLock();
  WheelDirectionGuide.addInfoButton();
  if (typeof Metronome === 'object') Metronome.init();
  if (typeof initPlayOpts === 'function') initPlayOpts();

  normalizeKeyState();
  document.body.dataset.tab = 'theory';      // instrument dock shows on the theory tab
  RenderEngine.full();
  applyI18n();
  if (typeof applyIcons === 'function') applyIcons();   // inject the line-SVG icon set
  if (typeof TransportSheet === 'object') TransportSheet.init();
  // Lift the metronome to body level: .app has position:relative + z-index, so it
  // creates a stacking context that traps #metronome (z-index 9000) BELOW the
  // transport island (a body-level sibling). On mobile that made the metronome
  // panel open hidden behind the island. It's position:fixed, so relocating it
  // doesn't change where it appears — only which stacking context it lives in.
  const _metro = document.getElementById('metronome');
  if (_metro && _metro.parentElement !== document.body) document.body.appendChild(_metro);
  if (typeof _syncVoiceUI === 'function') _syncVoiceUI();   // reflect the saved instrument sound
  if (typeof initBuilderFocus === 'function') initBuilderFocus();   // scroll → builder fills the screen
  if (typeof tel === 'function') tel('app_open');

  // Opened from a shared link → invite them to play the loop (audio needs the tap).
  if (_sharedLoop && typeof showSharedBanner === 'function') {
    setTimeout(showSharedBanner, 420);
  } else if (typeof Onboarding === 'object' && Onboarding.shouldShow()) {
    // First-run welcome tour (once; re-openable from the header "?" button).
    setTimeout(() => Onboarding.open(), 520);
  }
})();
