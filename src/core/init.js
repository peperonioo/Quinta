// ── INIT ──────────────────────────────────────────────
// Plasma background, theme, palette, and app bootstrap.

// Plasma WebGL
const PALETTES_DATA = PALETTES;
(function initPlasma() {
  const pc = document.getElementById('plasma');
  const gl = pc ? pc.getContext('webgl', { antialias:false, alpha:false }) : null;
  const hasGL = !!gl;
  if (pc && !hasGL) pc.style.display = 'none';

  let uLoc, tLoc, c1Loc, c2Loc, c3Loc, dLoc;
  if (hasGL) {
    const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
    const FS = `
      precision mediump float;
      uniform vec2 u;uniform float t;
      uniform vec3 c1,c2,c3;uniform float d;
      void main(){
        vec2 v=gl_FragCoord.xy/u-.5;
        float b=sin(v.x*3.+t*.5)*sin(v.y*3.+t*.3)+sin(length(v)*5.-t*.7)*.5;
        b=b*.5+.5;
        vec3 col=mix(mix(c1,c2,b),c3,sin(t*.2)*.5+.5);
        gl_FragColor=vec4(col*d,1);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog,'p');
    gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    uLoc  = gl.getUniformLocation(prog,'u');
    tLoc  = gl.getUniformLocation(prog,'t');
    c1Loc = gl.getUniformLocation(prog,'c1');
    c2Loc = gl.getUniformLocation(prog,'c2');
    c3Loc = gl.getUniformLocation(prog,'c3');
    dLoc  = gl.getUniformLocation(prog,'d');
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
    if (hasGL) {
      const [c1,c2,c3] = pal.colors.map(hexToVec);
      gl.uniform3fv(c1Loc, c1); gl.uniform3fv(c2Loc, c2); gl.uniform3fv(c3Loc, c3);
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
  const setIntensity = () => { if (hasGL) gl.uniform1f(dLoc, intensity * 0.38 * dimFactor); };

  const intensityEl = document.getElementById('plasmaIntensity');
  if (intensityEl) {
    intensityEl.value = intensity;
    intensityEl.addEventListener('input', () => {
      intensity = parseFloat(intensityEl.value) || 1;
      st.intensity = intensity; saveState(); setIntensity();
    });
  }

  applyPalette(currentPal);
  if (!hasGL) return; // palette/intensity UI stays; no animation loop without WebGL

  function resize() {
    pc.width  = Math.round(innerWidth  * resScale);
    pc.height = Math.round(innerHeight * resScale);
    gl.viewport(0,0,pc.width,pc.height);
    gl.uniform2f(uLoc, pc.width, pc.height);
  }
  window.addEventListener('resize', resize, {passive:true}); resize();
  setIntensity();

  let tVal = 0;
  (function loop() {
    tVal += 0.014;
    gl.uniform1f(tLoc, tVal);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(loop);
  })();
})();

function toggleTheme() {
  const apply = () => {
    isLight = !isLight;
    st.theme = isLight ? 'light' : 'dark';
    document.body.classList.toggle('light', isLight);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = isLight ? '☾' : '☀';
    saveState();
    renderWheel();
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Radial wipe from the theme button via the View Transitions API (graceful
  // fallback to an instant switch where it's unsupported).
  if (!document.startViewTransition || reduce) { apply(); return; }
  const btn = document.getElementById('themeBtn');
  const r = btn?.getBoundingClientRect();
  document.documentElement.style.setProperty('--vt-x', (r ? r.left + r.width / 2 : innerWidth - 40) + 'px');
  document.documentElement.style.setProperty('--vt-y', (r ? r.top + r.height / 2 : 40) + 'px');
  document.startViewTransition(apply);
}

// App boot
(function init() {
  MobileOptimizer.init();
  document.body.classList.toggle('light', isLight);
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.textContent = isLight ? '☾' : '☀';

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
  WheelDirectionGuide.addInfoButton();

  normalizeKeyState();
  RenderEngine.full();
  applyI18n();
})();
