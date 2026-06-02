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
    const arcStroke = isDark ? 'rgba(240,237,232,.30)' : 'rgba(20,20,20,.24)';
    const labelFill = isDark ? 'rgba(240,237,232,.55)' : 'rgba(20,20,20,.48)';
    const subFill   = isDark ? 'rgba(240,237,232,.32)' : 'rgba(20,20,20,.3)';

    // The wheel sectors end at r=286 and the viewBox edge is at r=300.
    // The arcs sit OUTSIDE the wheel in the SVG overflow region (overflow:visible),
    // and labels sit further out still, so nothing overlaps the chord names.
    // The wheel sectors end at r=286 and the viewBox edge is at r=300. The SVG
    // has a CSS drop-shadow filter whose region clips anything past the viewBox,
    // so the arc must stay at r<=300 (otherwise its 3 o'clock / 9 o'clock middle
    // gets clipped — the "split" the arc used to show). R=298 sits in the gap
    // just outside the wheel ring and renders continuously.
    const R   = 298;   // arc radius — just outside the wheel ring, inside viewBox
    const RL  = 330;   // label radius — outside the arcs, in the empty corners

    // Build the arc as a sampled polyline of concentric points around (300,300).
    // This avoids the SVG `A` command's center/sweep ambiguity (which was
    // curving one arc inward and splitting the other), guaranteeing both arcs
    // bulge OUTWARD and stay continuous.
    const arcPath = (rad, a0, a1, stepDeg = 2.5) => {
      const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / stepDeg));
      let d = '';
      for (let i = 0; i <= n; i++) {
        const ang = a0 + (a1 - a0) * (i / n);
        const [x, y] = polar(rad, ang);
        d += (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)} `;
      }
      return d.trim();
    };

    // Helper: a tangential arrowhead pointing along the arc's direction of
    // travel. `lead` is the tip angle (ahead in travel), `tail` the base angle.
    const arrowAt = (lead, tail) => {
      const [tx, ty]   = polar(R,     lead);
      const [b1x, b1y] = polar(R - 6, tail);
      const [b2x, b2y] = polar(R + 6, tail);
      return se('polygon', {
        points: `${tx.toFixed(1)},${ty.toFixed(1)} ${b1x.toFixed(1)},${b1y.toFixed(1)} ${b2x.toFixed(1)},${b2y.toFixed(1)}`,
        fill:   arcStroke,
        class:  'dir-arrow',
      });
    };

    // Right side = Fifths (clockwise) · Left side = Fourths (counterclockwise).
    // Both arcs hug the outside of the wheel through the 3 o'clock (90°) and
    // 9 o'clock (270°) points respectively, bulging outward.

    // ── Fifths arc (right side, through 90°) ──────────
    const arcF = se('path', {
      d:              arcPath(R, 40, 140),
      fill:           'none',
      stroke:         arcStroke,
      'stroke-width': '1.4',
      'stroke-linecap':'round',
      'stroke-dasharray':'4 7',
      class:          'dir-arc dir-arc-fifths',
    });
    guide.appendChild(arcF);
    // Clockwise → tip ahead at higher angle (140 → 147), pointing down/out
    guide.appendChild(arrowAt(147, 137));

    // Labels for Fifths (upper-right corner, in the empty space outside the arc)
    const [fx, fy] = polar(RL, 51);
    const lFifths = se('text', {
      x: fx.toFixed(1), y: (fy - 3).toFixed(1),
      'text-anchor': 'middle',
      'font-family': 'DM Mono,monospace',
      'font-size':   '11',
      fill:          labelFill,
      'letter-spacing': '.12em',
      class: 'dir-label',
    });
    lFifths.textContent = t('dirguide.fifths').toUpperCase();
    guide.appendChild(lFifths);

    const lFifthsSub = se('text', {
      x: fx.toFixed(1), y: (fy + 11).toFixed(1),
      'text-anchor': 'middle',
      'font-family': 'DM Mono,monospace',
      'font-size':   '8',
      fill:          subFill,
      'letter-spacing': '.04em',
      class: 'dir-label-sub',
    });
    lFifthsSub.textContent = t('dirguide.clockwise') + ' ↻';
    guide.appendChild(lFifthsSub);

    // ── Fourths arc (left side, through 270°) ─────────
    const arcFo = se('path', {
      d:              arcPath(R, 220, 320),
      fill:           'none',
      stroke:         arcStroke,
      'stroke-width': '1.4',
      'stroke-linecap':'round',
      'stroke-dasharray':'4 7',
      class:          'dir-arc dir-arc-fourths',
    });
    guide.appendChild(arcFo);
    // Counterclockwise → tip ahead at lower angle (220 → 213), pointing down/out
    guide.appendChild(arrowAt(213, 223));

    // Labels for Fourths (upper-left corner, in the empty space outside the arc)
    const [ox, oy] = polar(RL, 309);
    const lFourths = se('text', {
      x: ox.toFixed(1), y: (oy - 3).toFixed(1),
      'text-anchor': 'middle',
      'font-family': 'DM Mono,monospace',
      'font-size':   '11',
      fill:          labelFill,
      'letter-spacing': '.12em',
      class: 'dir-label',
    });
    lFourths.textContent = t('dirguide.fourths').toUpperCase();
    guide.appendChild(lFourths);

    const lFourthsSub = se('text', {
      x: ox.toFixed(1), y: (oy + 11).toFixed(1),
      'text-anchor': 'middle',
      'font-family': 'DM Mono,monospace',
      'font-size':   '8',
      fill:          subFill,
      'letter-spacing': '.04em',
      class: 'dir-label-sub',
    });
    lFourthsSub.textContent = '↺ ' + t('dirguide.ccw');
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
      document.body.appendChild(pop);
    }
    const row = (mk, mkClass, key) =>
      `<li><span class="dgp-mk ${mkClass}">${mk}</span><span>${t(key)}</span></li>`;
    pop.innerHTML = `
      <button class="micro-close" onclick="WheelDirectionGuide._hidePopover()">✕</button>
      <h4>${t('dirguide.popover.title')}</h4>
      <p class="dgp-intro">${t('dirguide.popover.intro')}</p>
      <ul class="dgp-legend">
        ${row('', 'mk-tonic', 'dirguide.popover.tonic')}
        ${row('', 'mk-outer', 'dirguide.popover.outer')}
        ${row('', 'mk-inner', 'dirguide.popover.inner')}
        ${row('♯♭', 'mk-sig', 'dirguide.popover.sig')}
        ${row('↻', 'mk-dir', 'dirguide.popover.cw')}
        ${row('↺', 'mk-dir', 'dirguide.popover.ccw')}
      </ul>`;

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
