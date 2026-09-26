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

    // The scroll-linked collapsing wheel (--sp) was retired in V6.47. It came
    // from the single-page era; with four modes the wheel only exists in
    // Explore — where the collapse was already disabled — and everywhere else
    // it only pulled the content up to 62px FASTER than the finger for the first
    // 260px of every scroll, while writing a custom property on <body> each
    // frame (a full-document style recalc). Pure cost, and the "not tight" feel.
  },
};
