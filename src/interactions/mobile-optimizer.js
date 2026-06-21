// ── MOBILE OPTIMIZER ──────────────────────────────────

const InteractionController = {
  active: null,
  start(type) { this.active = { type, ts: Date.now() }; document.body.dataset.interaction = type; },
  end()        { this.active = null; delete document.body.dataset.interaction; },
  is(type)     { return this.active && this.active.type === type; },
};

const MobileOptimizer = {
  isMobile: matchMedia('(max-width: 860px)').matches,

  init() {
    const mq = matchMedia('(max-width: 860px)');
    // Collapse the instrument drawers by default on mobile (§10.5): they are
    // optional support and should not push the harmony flow down the page.
    const collapseDrawers = () =>
      document.querySelectorAll('.drawers .drawer[open]').forEach(d => d.removeAttribute('open'));
    let wasMobile = null;
    const apply = () => {
      this.isMobile = mq.matches;
      document.documentElement.classList.toggle('is-mobile-browser', this.isMobile);
      // Collapse on initial mobile load and on desktop→mobile transitions, but
      // never when already mobile (don't fight a user who reopened a drawer).
      if (this.isMobile && wasMobile !== true) collapseDrawers();
      wasMobile = this.isMobile;
    };
    apply();
    mq.addEventListener?.('change', apply);
    document.addEventListener('touchstart', () => {}, { passive: true });

    // Prevent page scroll while the wheel is being dragged
    const wheel = document.getElementById('wheelSvg');
    if (wheel) {
      ['touchmove', 'pointermove'].forEach(ev =>
        wheel.addEventListener(ev, e => {
          if (InteractionController.active) e.preventDefault();
        }, { passive: false })
      );
    }

    // ── Collapsing wheel (mobile) ─────────────────────────
    // As you scroll down into the builder, write a 0→1 scroll progress to
    // `--sp` on <body>. CSS uses it to shrink/dock the wheel (sticky) and pull
    // the lower surfaces up — a native-style collapsing header. Only transform
    // and opacity are driven (GPU), so it stays smooth on phones. iOS-safe
    // (no CSS scroll-timeline, which WebKit doesn't support yet).
    const RANGE = 160;                       // px of scroll over which it collapses
    const setProgress = () => {
      if (!mq.matches) { document.body.style.removeProperty('--sp'); return; }
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const p = Math.min(1, Math.max(0, y / RANGE));
      document.body.style.setProperty('--sp', p.toFixed(3));
    };
    let rafId = 0;
    const onScroll = () => { if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; setProgress(); }); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', setProgress);
    setProgress();
  },
};
