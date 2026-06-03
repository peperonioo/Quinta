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

  // ── Explanation panels ────────────────────────────────
  // Instead of one dropdown, several panels sit around the wheel: an intro
  // ("what is it / why use it") plus a Fifths card on the right and a Fourths
  // card on the left — each explaining that direction musically.
  _buildPanels() {
    let wrap = document.getElementById('dirGuidePanels');
    if (wrap) return wrap;
    wrap = document.createElement('div');
    wrap.id = 'dirGuidePanels';
    wrap.className = 'dir-panels';
    wrap.innerHTML = `
      <article class="dir-panel dir-panel-intro">
        <button class="micro-close" onclick="WheelDirectionGuide.toggle()" aria-label="Close">✕</button>
        <h4 data-i18n="dirguide.why.title">${t('dirguide.why.title')}</h4>
        <p data-i18n="dirguide.why.body">${t('dirguide.why.body')}</p>
      </article>
      <article class="dir-panel dir-panel-fourths">
        <h4><span class="dir-panel-tag">↺</span> <span data-i18n="dirguide.fourthsCard.title">${t('dirguide.fourthsCard.title')}</span></h4>
        <p data-i18n="dirguide.fourthsCard.body">${t('dirguide.fourthsCard.body')}</p>
      </article>
      <article class="dir-panel dir-panel-fifths">
        <h4><span class="dir-panel-tag">↻</span> <span data-i18n="dirguide.fifthsCard.title">${t('dirguide.fifthsCard.title')}</span></h4>
        <p data-i18n="dirguide.fifthsCard.body">${t('dirguide.fifthsCard.body')}</p>
      </article>`;
    // Click on the scrim / empty backdrop (desktop or mobile) closes the guide.
    wrap.addEventListener('click', e => {
      if (e.target === wrap || e.target.classList.contains('dir-scrim')) WheelDirectionGuide.toggle();
    });
    document.body.appendChild(wrap);
    return wrap;
  },

  _showPanels() {
    const wrap = this._buildPanels();
    // refresh text in case language changed
    wrap.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    wrap.classList.add('open');
    this._positionPanels();
    if (!this._boundReposition) {
      this._boundReposition = () => this._positionPanels();
      window.addEventListener('resize', this._boundReposition, { passive: true });
      window.addEventListener('scroll', this._boundReposition, { passive: true });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.visible) this.toggle(); });
    }
  },

  _positionPanels() {
    const wrap = document.getElementById('dirGuidePanels');
    if (!wrap || !wrap.classList.contains('open')) return;
    const svg = document.getElementById('wheelSvg');
    const r   = svg?.getBoundingClientRect(); if (!r) return;
    const intro   = wrap.querySelector('.dir-panel-intro');
    const fifths  = wrap.querySelector('.dir-panel-fifths');
    const fourths = wrap.querySelector('.dir-panel-fourths');

    // Mobile: let CSS stack the cards in a centered column.
    if (matchMedia('(max-width: 860px)').matches) {
      [intro, fifths, fourths].forEach(c => { if (c) { c.style.left = c.style.top = ''; } });
      return;
    }

    const gap = 14;
    const vw  = window.innerWidth, vh = window.innerHeight;
    const clampLeft = (x, w) => Math.min(Math.max(12, x), vw - w - 12);
    const clampTop  = (y, h) => Math.min(Math.max(12, y), vh - h - 12);
    const place = (el, left, top) => { el.style.left = Math.round(left) + 'px'; el.style.top = Math.round(top) + 'px'; };

    // Small banners spread around the wheel: "what / why" + Fifths on the
    // right (next to the wheel), Fourths on the left.
    if (intro)   place(intro,   clampLeft(r.right + gap - 4, intro.offsetWidth),
                                clampTop(r.top + r.height * 0.06, intro.offsetHeight));
    if (fifths)  place(fifths,  clampLeft(r.right + gap - 4, fifths.offsetWidth),
                                clampTop(r.top + r.height * 0.64, fifths.offsetHeight));
    if (fourths) place(fourths, clampLeft(r.left - gap - fourths.offsetWidth + 4, fourths.offsetWidth),
                                clampTop(r.top + r.height * 0.40 - fourths.offsetHeight / 2, fourths.offsetHeight));
  },

  _hidePanels() {
    document.getElementById('dirGuidePanels')?.classList.remove('open');
  },

  // Back-compat aliases
  _showPopover() { this._showPanels(); },
  _hidePopover() { this._hidePanels(); },
};
