// ── INIT ──────────────────────────────────────────────
// Plasma background, theme, palette, and app bootstrap.

// Plasma WebGL
const PALETTES_DATA = PALETTES;
(function initPlasma() {
  const pc = document.getElementById('plasma');
  if (!pc) return;
  const gl = pc.getContext('webgl', { antialias:false, alpha:false });
  if (!gl) { pc.style.display='none'; return; }

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
  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog,'p');
  gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const uLoc  = gl.getUniformLocation(prog,'u');
  const tLoc  = gl.getUniformLocation(prog,'t');
  const c1Loc = gl.getUniformLocation(prog,'c1');
  const c2Loc = gl.getUniformLocation(prog,'c2');
  const c3Loc = gl.getUniformLocation(prog,'c3');
  const dLoc  = gl.getUniformLocation(prog,'d');

  function hexToVec(hex) {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    return [r,g,b];
  }

  let currentPal = st.palette || 0;
  function applyPalette(idx) {
    currentPal = idx; st.palette = idx; saveState();
    document.querySelectorAll('.pal-btn').forEach((b,i) => b.classList.toggle('active', i === idx));
    const pal = PALETTES_DATA[idx];
    if (!pal) return;
    document.body.style.setProperty('--bg-plasma', pal.bg);
    const [c1,c2,c3] = pal.colors.map(hexToVec);
    gl.uniform3fv(c1Loc, c1); gl.uniform3fv(c2Loc, c2); gl.uniform3fv(c3Loc, c3);
  }
  window._setPalActive = applyPalette;

  function resize() {
    pc.width = innerWidth; pc.height = innerHeight;
    gl.viewport(0,0,pc.width,pc.height);
    gl.uniform2f(uLoc, pc.width, pc.height);
  }
  window.addEventListener('resize', resize, {passive:true}); resize();
  applyPalette(currentPal);

  let intensity = parseFloat(st.intensity) || 1;
  gl.uniform1f(dLoc, intensity * 0.38);

  const intensityEl = document.getElementById('plasmaIntensity');
  if (intensityEl) {
    intensityEl.value = intensity;
    intensityEl.addEventListener('input', () => {
      intensity = parseFloat(intensityEl.value) || 1;
      st.intensity = intensity;
      saveState();
      gl.uniform1f(dLoc, intensity * 0.38);
    });
  }

  let palRow = document.getElementById('palRow');
  if (palRow) {
    PALETTES_DATA.forEach((pal, i) => {
      const btn = document.createElement('button');
      btn.className = 'pal-btn' + (i === currentPal ? ' active' : '');
      btn.style.background = pal.colors[0];
      btn.title = pal.name;
      btn.onclick = () => applyPalette(i);
      palRow.appendChild(btn);
    });
  }

  let tVal = 0;
  (function loop(now) {
    tVal += 0.008;
    gl.uniform1f(tLoc, tVal);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(loop);
  })();
})();

function toggleTheme() {
  isLight = !isLight;
  st.theme = isLight ? 'light' : 'dark';
  document.body.classList.toggle('light', isLight);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = isLight ? '☾' : '☀';
  saveState();
  renderWheel();
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
