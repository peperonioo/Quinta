// ── ACTION MAP (V6.18) ────────────────────────────────
// The single place a declared `data-act` name becomes a function call. Every
// entry is a lambda, so the target is resolved when the action RUNS, not when
// this file loads — which is what lets the map sit early in the bundle while
// the functions it points at are defined further down.
//
// Adding UI? Declare `data-act="thing.verb"` in the markup and add the line
// here. The "Action registry integrity" test asserts both directions: every
// declared action resolves, and every registered action is reachable.

ActionRegistry.addAll({
  // ── Builder / timeline ──
  'builder.surprise': ()      => surpriseMe(),
  // These three read the element they were bound to; under delegation
  // e.currentTarget is the document, so it is passed explicitly.
  'clip.drag':        (el, e) => BarDrag.start(e, _aInt(el, 'idx'), el),
  'clip.open':        (el, e) => BarDrag.key(e, _aInt(el, 'idx')),
  'clip.resize':      (el, e) => DurationDrag.start(e, _aInt(el, 'idx'), el),
  'playhead.drag':    (el, e) => PlayheadDrag.start(e, el),

  // ── Theory ──
  'degree.show':      el => showDegreePopup(_aInt(el, 'idx')),
  'mood.set':         el => AppActions.setMood(_aStr(el, 'id')),
  'mode.choose':      el => ModeMenu.choose(_aStr(el, 'id')),
  'color.toggle':     ()  => ColorChords.toggle(),

  // ── Production grid ──
  'grid.toggle':      el => toggleStep(_aInt(el, 'ri'), _aInt(el, 'i')),

  // ── Library ──
  'lib.load':         el => Library.loadSaved(_aStr(el, 'id')),
  'lib.remove':       el => Library.remove(_aStr(el, 'id')),
  'lib.preset':       el => Library.loadPreset(_aInt(el, 'idx')),

  // ── Comeback panel ──
  'comeback.close':   ()  => Comeback.close(),
  'comeback.resume':  el  => Comeback.resume(_aStr(el, 'id')),
  'comeback.start':   ()  => Comeback.startChallenge(),

  // ── Onboarding ──
  'tour.go':          el => Onboarding.go(_aInt(el, 'idx')),
});
