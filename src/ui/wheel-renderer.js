// ── WHEEL RENDERER ────────────────────────────────────

let wRot = 0, wAnim = null;

function normDeg(d) { return ((d % 360) + 360) % 360; }
function shortestDelta(to, from) {
  let d = to - from;
  while (d > 180)  d -= 360;
  while (d < -180) d += 360;
  return d;
}
function nearestFifthIndex(rot) { return ((Math.round(-rot / 30) % 12) + 12) % 12; }

function syncWheelLabels(rot) {
  const grp = document.getElementById('wg'); if (!grp) return;
  grp.querySelectorAll('text[data-x]').forEach(t => {
    const x = parseFloat(t.getAttribute('data-x'));
    const y = parseFloat(t.getAttribute('data-y'));
    t.setAttribute('transform', `rotate(${-rot},${x},${y})`);
  });
}

function renderWheel() {
  const aKey = wheelKey();           // rotate/highlight by the SECTOR, not the minor letter
  const ai   = FIFTHS.indexOf(aKey);
  const tRot = -ai * 30;
  const grp  = document.getElementById('wg');
  if (!grp) return;
  grp.innerHTML = '';

  FIFTHS.forEach((k, i) => {
    const isActive = k === aKey;
    const sa = i * 30, a1 = sa - 15, a2 = sa + 15;

    // Outer sector r: 194–286
    const [ox1,oy1] = polar(286,a1), [ox2,oy2] = polar(286,a2);
    const [ox3,oy3] = polar(194,a2), [ox4,oy4] = polar(194,a1);
    const od = `M${ox1} ${oy1} A286 286 0 0 1 ${ox2} ${oy2} L${ox3} ${oy3} A194 194 0 0 0 ${ox4} ${oy4}Z`;
    const og = se('g', { cursor:'pointer' });
    const op = se('path', {
      d: od,
      fill:   isActive ? (isLight ? 'rgba(232,68,26,.88)' : 'rgba(232,68,26,.82)') : (isLight ? 'rgba(255,255,255,.38)' : 'rgba(255,255,255,.032)'),
      stroke: isActive ? 'rgba(255,120,80,.4)' : (isLight ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.08)'),
      'stroke-width': isActive ? '1.8' : '0.8',
    });
    if (isActive) { op.setAttribute('filter', 'url(#fGlow)'); op.setAttribute('class', 'active-sector'); }
    og.appendChild(op);

    // Primary label (major/minor view)
    const primaryLabel   = st.wheelView === 'minor' ? (relativeMinor(k) || '') : k;
    const secondaryLabel = st.wheelView === 'minor' ? k : (relativeMinor(k) || '');
    const [lx,ly] = polar(242, sa);
    const kt = se('text', {
      x:lx, y:ly+8, 'text-anchor':'middle', 'dominant-baseline':'middle',
      'font-family':'DM Serif Display,Georgia,serif', 'font-weight':'700', 'font-style':'normal',
      'font-size': isActive ? '30' : '24',
      fill: isActive ? '#fff' : (isLight ? 'rgba(20,20,20,.82)' : 'rgba(240,237,232,.85)'),
      class:'wheel-label', 'data-x':lx, 'data-y':ly,
      transform:`rotate(${-wRot},${lx},${ly})`,
    });
    kt.textContent = primaryLabel;
    og.appendChild(kt);

    // Accidental at outer rim r=268
    const [ax,ay] = polar(268, sa);
    const at = se('text', {
      x:ax, y:ay+1, 'text-anchor':'middle', 'dominant-baseline':'middle',
      'font-family':'DM Mono,monospace', 'font-size':'10',
      fill: isLight ? 'rgba(20,20,20,.46)' : 'rgba(255,255,255,.40)',
      class:'wheel-label', 'data-x':ax, 'data-y':ay,
      transform:`rotate(${-wRot},${ax},${ay})`,
    });
    at.textContent = ACC[i] === '0' ? '♮' : ACC[i];
    og.appendChild(at);
    og.addEventListener('click', e => {
      if (suppressWheelClick) { e.preventDefault(); e.stopPropagation(); return; }
      e.stopPropagation();
      selectWheelKey(k);
    });
    grp.appendChild(og);

    // Inner sector (relative minor) r: 150–194
    const [ix1,iy1] = polar(194,a1), [ix2,iy2] = polar(194,a2);
    const [ix3,iy3] = polar(150,a2), [ix4,iy4] = polar(150,a1);
    const id2 = `M${ix1} ${iy1} A194 194 0 0 1 ${ix2} ${iy2} L${ix3} ${iy3} A150 150 0 0 0 ${ix4} ${iy4}Z`;
    const ig  = se('g', { cursor:'pointer' });
    const ip  = se('path', {
      d: id2,
      fill:   isActive ? (isLight ? 'rgba(232,68,26,.30)' : 'rgba(160,40,10,.46)') : (isLight ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.04)'),
      stroke: isLight ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.08)', 'stroke-width':'0.6',
    });
    ig.appendChild(ip);

    const [rx,ry] = polar(172, sa);
    const rt = se('text', {
      x:rx, y:ry+2, 'text-anchor':'middle', 'dominant-baseline':'middle',
      'font-family':'DM Serif Display,Georgia,serif', 'font-weight':'700', 'font-style':'normal',
      'font-size': isActive ? '20' : '17',
      fill: isActive ? 'rgba(255,160,120,.96)' : (isLight ? 'rgba(20,20,20,.42)' : 'rgba(240,237,232,.45)'),
      class:'wheel-label', 'data-x':rx, 'data-y':ry,
      transform:`rotate(${-wRot},${rx},${ry})`,
    });
    rt.textContent = secondaryLabel;
    ig.appendChild(rt);
    ig.addEventListener('click', e => {
      if (suppressWheelClick) { e.preventDefault(); e.stopPropagation(); return; }
      e.stopPropagation();
      selectWheelKey(k);
    });
    grp.appendChild(ig);
  });

  // Animate rotation
  syncWheelLabels(wRot);
  if (wAnim) cancelAnimationFrame(wAnim);
  const s0 = wRot;
  const delta = shortestDelta(tRot, s0);
  const dur = 650, t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    wRot = s0 + delta * e;
    grp.setAttribute('transform', `rotate(${wRot},300,300)`);
    syncWheelLabels(wRot);
    if (p < 1) wAnim = requestAnimationFrame(tick);
    else { wRot = s0 + delta; grp.setAttribute('transform', `rotate(${wRot},300,300)`); syncWheelLabels(wRot); }
  }
  wAnim = requestAnimationFrame(tick);

  // Center key
  const kStr = displayKeyLabel();
  const kEl  = document.getElementById('cKey');
  if (kEl) {
    kEl.textContent = kStr;
    const big  = kStr.length > 1 ? 62 : 80;
    const yPos = kStr.length > 1 ? 310 : 315;
    kEl.setAttribute('font-size', big);
    kEl.setAttribute('y', yPos);
    kEl.setAttribute('fill', isLight ? '#141414' : '#f0ede8');
  }

  // Relative minor in center
  const relEl = document.getElementById('cRel');
  if (relEl) {
    relEl.textContent = st.wheelView === 'minor' ? anchorKey() : (relativeMinor(anchorKey()) || '');
    relEl.setAttribute('y',         kStr.length > 1 ? '352' : '356');
    relEl.setAttribute('font-size', kStr.length > 1 ? '34' : '32');
  }

  // Theme-aware background circles
  const bgCircle = document.getElementById('wheelBg');
  if (bgCircle) bgCircle.setAttribute('fill', isLight ? 'rgba(255,255,255,.26)' : 'rgba(0,0,0,.24)');
  const innerDisc = document.getElementById('centerDisc');
  if (innerDisc) innerDisc.setAttribute('fill', isLight ? 'rgba(248,245,240,.78)' : 'rgba(6,6,10,.72)');

  // Subtle wheel-pointer color
  const ptr = document.getElementById('wheelPointer');
  if (ptr) ptr.setAttribute('fill', isLight ? 'rgba(20,20,20,.28)' : 'rgba(240,237,232,.38)');

  // Re-render direction guide (respects theme change)
  if (WheelDirectionGuide.visible) WheelDirectionGuide.render();
}

function updateCircleTheme() { renderWheel(); }

// ── Selection FX (V4.0 batch 2) ───────────────────────
// A ripple from the centre, a bloom of the centre letter, and a staggered
// cascade through degrees / piano / guitar when the key changes.
const WheelFX = {
  _prevKey: null,
  select() {
    const key = anchorKey();
    const changed = key !== this._prevKey;
    this._prevKey = key;
    this.ripple();
    this.bloom();
    if (changed) this.cascade();
  },
  ripple() {
    const svg = document.getElementById('wheelSvg'); if (!svg) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ptr = document.getElementById('wheelPointer');
    const c = se('circle', { cx:300, cy:300, r:148, class:'wheel-ripple' });
    if (ptr) svg.insertBefore(c, ptr); else svg.appendChild(c);
    c.addEventListener('animationend', () => c.remove(), { once:true });
    setTimeout(() => { if (c.isConnected) c.remove(); }, 900);
  },
  bloom() {
    ['cKey','cRel'].forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      el.classList.remove('bloom'); void el.getBoundingClientRect();
      el.classList.add('bloom');
      el.addEventListener('animationend', () => el.classList.remove('bloom'), { once:true });
    });
  },
  cascade() {
    ['.degrees-row', '#piano', '#guitar'].forEach(sel => {
      const el = document.querySelector(sel); if (!el) return;
      el.classList.remove('fx-cascade'); void el.offsetWidth;
      el.classList.add('fx-cascade');
      setTimeout(() => el.classList.remove('fx-cascade'), 800);
    });
  },
};

