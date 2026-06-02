// ── WHEEL DIRECTION GUIDE ─────────────────────────────
// Shows subtle Fifths / Fourths arcs around the wheel.
// Toggled by the info button near the wheel.

const WheelDirectionGuide = {
  visible: false,

  toggle() {
    this.visible = !this.visible;
    this.render();
    this._updateInfoBtn();
    if (this.visible) this._showPopover();
    else this._hidePopover();
  },

  render() {
    const svg = document.getElementById('wheelSvg');
    if (!svg) return;

    let guide = document.getElementById('wheelDirectionGuide');
    if (!guide) {
      guide = document.createElementNS(NS, 'g');
      guide.id = 'wheelDirectionGuide';
      guide.setAttribute('pointer-events', 'none');
      // Place after #ticks so it sits above the tick ring but below the pointer
      const ptr = document.getElementById('wheelPointer');
      if (ptr) svg.insertBefore(guide, ptr);
      else svg.appendChild(guide);
    }

    guide.innerHTML = '';
    if (!this.visible) { guide.style.opacity = '0'; return; }

    const isDark = !document.body.classList.contains('light');
    const arcStroke = isDark ? 'rgba(240,237,232,.28)' : 'rgba(20,20,20,.22)';
    const labelFill = isDark ? 'rgba(240,237,232,.52)' : 'rgba(20,20,20,.46)';
    const subFill   = isDark ? 'rgba(240,237,232,.3)'  : 'rgba(20,20,20,.28)';

    // r=297 sits just outside the outer wheel ring (r=286).
    // Right arc: angles 40° – 140° (NE to SE in wheel convention = clockwise Fifths side)
    const R = 297;
    const [rx1, ry1] = polar(R, 38);
    const [rx2, ry2] = polar(R, 142);
    // Left arc: angles 218° – 322° (SW to NW = counterclockwise Fourths side)
    const [lx1, ly1] = polar(R, 218);
    const [lx2, ly2] = polar(R, 322);

    // ── Fifths arc (right side, clockwise sweep) ──────
    const arcF = se('path', {
      d:              `M ${rx1.toFixed(1)},${ry1.toFixed(1)} A ${R},${R} 0 0 1 ${rx2.toFixed(1)},${ry2.toFixed(1)}`,
      fill:           'none',
      stroke:         arcStroke,
      'stroke-width': '1.4',
      'stroke-linecap':'round',
      'stroke-dasharray':'4 7',
      class:          'dir-arc dir-arc-fifths',
    });
    guide.appendChild(arcF);

    // Arrowhead at end of Fifths arc (clockwise, points downward at 3–4 o'clock)
    const [ax1, ay1] = polar(R - 8, 150);
    const [ax2, ay2] = polar(R + 8, 150);
    const [ax3, ay3] = polar(R,     138);
    const arrowF = se('polygon', {
      points:  `${ax1.toFixed(1)},${ay1.toFixed(1)} ${ax2.toFixed(1)},${ay2.toFixed(1)} ${ax3.toFixed(1)},${ay3.toFixed(1)}`,
      fill:    arcStroke,
      class:   'dir-arrow',
    });
    guide.appendChild(arrowF);

    // Labels for Fifths (right side)
    const lFifths = se('text', {
      x: '556', y: '294',
      'text-anchor': 'middle',
      'font-family': 'DM Mono,monospace',
      'font-size':   '10.5',
      fill:          labelFill,
      'letter-spacing': '.1em',
      class: 'dir-label',
    });
    lFifths.textContent = t('dirguide.fifths').toUpperCase();
    guide.appendChild(lFifths);

    const lFifthsSub = se('text', {
      x: '556', y: '308',
      'text-anchor': 'middle',
      'font-family': 'DM Mono,monospace',
      'font-size':   '8',
      fill:          subFill,
      'letter-spacing': '.04em',
      class: 'dir-label-sub',
    });
    lFifthsSub.textContent = t('dirguide.clockwise') + ' →';
    guide.appendChild(lFifthsSub);

    // ── Fourths arc (left side, counterclockwise sweep) ─
    const arcFo = se('path', {
      d:              `M ${lx1.toFixed(1)},${ly1.toFixed(1)} A ${R},${R} 0 0 0 ${lx2.toFixed(1)},${ly2.toFixed(1)}`,
      fill:           'none',
      stroke:         arcStroke,
      'stroke-width': '1.4',
      'stroke-linecap':'round',
      'stroke-dasharray':'4 7',
      class:          'dir-arc dir-arc-fourths',
    });
    guide.appendChild(arcFo);

    // Arrowhead at end of Fourths arc (counterclockwise, points upward at 9–10 o'clock)
    const [bx1, by1] = polar(R - 8, 310);
    const [bx2, by2] = polar(R + 8, 310);
    const [bx3, by3] = polar(R,     322);
    const arrowFo = se('polygon', {
      points:  `${bx1.toFixed(1)},${by1.toFixed(1)} ${bx2.toFixed(1)},${by2.toFixed(1)} ${bx3.toFixed(1)},${by3.toFixed(1)}`,
      fill:    arcStroke,
      class:   'dir-arrow',
    });
    guide.appendChild(arrowFo);

    // Labels for Fourths (left side)
    const lFourths = se('text', {
      x: '44', y: '294',
      'text-anchor': 'middle',
      'font-family': 'DM Mono,monospace',
      'font-size':   '10.5',
      fill:          labelFill,
      'letter-spacing': '.1em',
      class: 'dir-label',
    });
    lFourths.textContent = t('dirguide.fourths').toUpperCase();
    guide.appendChild(lFourths);

    const lFourthsSub = se('text', {
      x: '44', y: '308',
      'text-anchor': 'middle',
      'font-family': 'DM Mono,monospace',
      'font-size':   '8',
      fill:          subFill,
      'letter-spacing': '.04em',
      class: 'dir-label-sub',
    });
    lFourthsSub.textContent = '← ' + t('dirguide.ccw');
    guide.appendChild(lFourthsSub);

    // Animate in
    guide.style.opacity = '0';
    guide.style.transition = 'opacity 0.42s cubic-bezier(.22,1,.36,1)';
    requestAnimationFrame(() => { guide.style.opacity = '1'; });
  },

  // ── Info button (added to SVG once) ──────────────────
  addInfoButton() {
    const svg = document.getElementById('wheelSvg');
    if (!svg || document.getElementById('wheelInfoBtn')) return;
    const btn = document.createElementNS(NS, 'g');
    btn.id = 'wheelInfoBtn';
    btn.setAttribute('cursor', 'pointer');
    btn.setAttribute('class', 'wheel-info-btn');
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'Wheel direction guide');

    const circle = se('circle', { cx:'548', cy:'40', r:'14',
      fill: 'rgba(255,255,255,.06)', stroke: 'rgba(255,255,255,.14)', 'stroke-width':'1' });
    const text = se('text', { x:'548', y:'45', 'text-anchor':'middle',
      'font-size':'14', fill:'rgba(240,237,232,.55)', 'font-family':'DM Mono,monospace',
      'pointer-events':'none' });
    text.textContent = 'ⓘ';

    btn.appendChild(circle);
    btn.appendChild(text);
    btn.addEventListener('click', e => { e.stopPropagation(); WheelDirectionGuide.toggle(); });
    svg.appendChild(btn);
  },

  _updateInfoBtn() {
    const btn    = document.getElementById('wheelInfoBtn');
    const circle = btn?.querySelector('circle');
    if (!circle) return;
    if (this.visible) {
      circle.setAttribute('fill',   'rgba(232,68,26,.22)');
      circle.setAttribute('stroke', 'rgba(232,68,26,.55)');
    } else {
      circle.setAttribute('fill',   'rgba(255,255,255,.06)');
      circle.setAttribute('stroke', 'rgba(255,255,255,.14)');
    }
  },

  // ── Popover ───────────────────────────────────────────
  _showPopover() {
    let pop = document.getElementById('dirGuidePopover');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'dirGuidePopover';
      pop.className = 'micro-popover dir-guide-popover';
      pop.innerHTML = `
        <button class="micro-close" onclick="WheelDirectionGuide._hidePopover()">✕</button>
        <h4 id="dgpTitle"></h4>
        <p id="dgpBody" style="white-space:pre-line"></p>`;
      document.body.appendChild(pop);
    }
    const title = document.getElementById('dgpTitle');
    const body  = document.getElementById('dgpBody');
    if (title) title.textContent = t('dirguide.popover.title');
    if (body)  body.textContent  = t('dirguide.popover.body');

    // Position near the info button
    const btn = document.getElementById('wheelInfoBtn');
    if (btn) {
      const svgEl = document.getElementById('wheelSvg');
      const svgRect = svgEl?.getBoundingClientRect();
      if (svgRect) {
        const scale = svgRect.width / 600;
        const px = svgRect.left + 548 * scale;
        const py = svgRect.top  + 40  * scale;
        const pw = pop.offsetWidth || 300;
        const ph = pop.offsetHeight || 120;
        let left = px + 20;
        if (left + pw > window.innerWidth - 14) {
          left = px - pw - 20;
          pop.classList.add('flip');
        } else {
          pop.classList.remove('flip');
        }
        const top = Math.min(Math.max(14, py - ph / 2), window.innerHeight - ph - 14);
        pop.style.left = left + 'px';
        pop.style.top  = top  + 'px';
      }
    }
    pop.classList.add('open');
  },

  _hidePopover() {
    document.getElementById('dirGuidePopover')?.classList.remove('open');
  },
};
