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
  // Deleting a chord used to mean keyboard Delete or clearing everything. The ×
  // appears on the selected clip so it is one tap, where the chord is. It fires
  // on pointerdown, not click: the clip itself owns pointerdown (clip.drag), and
  // the nearest [data-act-down] wins — a click handler here would never run,
  // because starting the drag swallows the click.
  'clip.remove':      (el, e) => { if (e) { e.stopPropagation(); e.preventDefault(); }
                                   const i = _aInt(el, 'idx');
                                   if (typeof Inspector === 'object') Inspector.clear();
                                   HistoryEngine.remove(i); },
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
  'tour.skip':        ()  => Onboarding.skip(),
  'tour.prev':        ()  => Onboarding.prev(),
  'tour.next':        ()  => Onboarding.next(),
  'tour.reopen':      ()  => { Onboarding.open(true); Settings.close(); },

  // ── Chrome / tabs ──
  'settings.toggle':  ()     => Settings.toggle(),
  'settings.close':   ()     => Settings.close(),
  'tab.go':           el     => switchTab(_aStr(el, 'tab'), el),
  // Tapping the key in the context bar takes you to where keys are chosen.
  'ctx.key':          ()     => switchTab('explore'),

  // ── Metronome ──
  'metro.slower':     ()     => Metronome.stepBpm(-1),
  'metro.faster':     ()     => Metronome.stepBpm(1),
  'metro.play':       ()     => Metronome.toggle(),
  'metro.panel':      ()     => Metronome.toggleOpen(),
  'metro.tap':        (el, e) => Metronome.tap(e),
  // Keyboard-only activation: a real tap already fired on pointerdown, and
  // detail===0 is how a synthetic (keyboard) click identifies itself.
  'metro.tapKey':     (el, e) => { if (e && e.detail === 0) Metronome.tap(e); },
  'metro.sound':      el     => Metronome.setSound(_aStr(el, 'id')),

  // ── Wheel / theory ──
  'view.set':         el => setWheelView(_aStr(el, 'id')),
  'mode.menu':        (el, e) => ModeMenu.toggle(e),
  'emotion.toggle':   ()  => EmotionSuggester.toggle(),
  'popup.close':      ()  => closePopup(),

  // ── Builder ──
  'section.go':       el => switchSection(_aStr(el, 'id')),
  'prog.play':        ()  => toggleProgPlay(),
  'prog.loop':        el  => toggleLoop(el),
  'prog.chain':       el  => toggleChain(el),
  'prog.share':       ()  => shareProgression(),
  'builder.more':     el  => toggleBuilderMore(el),
  'builder.clear':    ()  => HistoryEngine.clear(),
  'builder.snap':     ()  => cycleSnap(),
  'builder.undo':     ()  => undoLastChange(),
  'play.opt':         el  => togglePlayOpt(_aStr(el, 'id'), el),

  // ── Export ──
  'export.open':      ()  => openExportMenu(),
  'export.wav':       ()  => exportAudio(),
  'export.stems':     ()  => exportStems(),
  'export.midi':      ()  => exportMIDI(),

  // ── Instruments ──
  'instr.go':         el => gotoInstrument(_aStr(el, 'id')),
  'voice.set':        el => setVoice(_aStr(el, 'id'), el),
  'shapes.toggle':    ()  => GuitarShapes.toggle(),

  // ── Library ──
  'lib.toggle':       ()  => Library.toggle(),
  'lib.close':        ()  => Library.close(),
  'lib.save':         ()  => Library.saveCurrent(),

  // ── Shared-link banner ──
  'shared.play':      ()  => playSharedLoop(),
  'shared.dismiss':   ()  => dismissSharedBanner(),

  // ── Settings ──
  'set.theme':        el => Settings.setTheme(_aStr(el, 'id')),
  'set.lang':         el => Settings.setLang(_aStr(el, 'id')),
  'set.piano':        el => Settings.setRealPiano(_aStr(el, 'id') === 'real'),
  'set.haptics':      el => Settings.setHaptics(_aStr(el, 'id') === 'on'),

  // ── Transport island ──
  'ts.open':          ()  => TransportSheet.open(),
  'ts.collapse':      ()  => TransportSheet.collapse(),

  // ── Guitar shapes ──
  'shapes.cardDown':  (el, e) => GuitarShapes.cardDown(e, _aInt(el, 'pos')),
  'shapes.next':      el => GuitarShapes.step(_aInt(el, 'pos'), 1),
  'shapes.prev':      el => GuitarShapes.step(_aInt(el, 'pos'), -1),
  'shapes.voicing':   el => GuitarShapes.setVoicing(_aInt(el, 'pos'), _aInt(el, 'idx')),
  'shapes.view':      el => GuitarShapes.view(_aStr(el, 'id')),
  'shapes.close':     ()  => GuitarShapes.close(),

  // ── Colour chords (out-of-key) ──
  'color.add':        el => ColorChords.add(_aInt(el, 'idx')),
  'color.preview':    el => ColorChords.preview(_aInt(el, 'idx')),
  'color.modulate':   el => ColorChords.modulateTo(_aInt(el, 'idx')),
  'color.close':      ()  => ColorChords.close(),

  // ── Emotion suggester ──
  'emotion.select':   el => EmotionSuggester.select(_aStr(el, 'id')),
  'emotion.apply':    ()  => EmotionSuggester.apply(),
  'emotion.close':    ()  => EmotionSuggester.close(),

  // ── Per-chord variant chooser ──
  'variant.pick':     el => ChordVariants.pick(_aStr(el, 'id')),
  'variant.dup':      ()  => ChordVariants._dup(),
  'variant.del':      ()  => ChordVariants._del(),

  // ── Inspector (V2 · B1) ──
  'insp.clear':       ()  => Inspector.clear(),
  'insp.variant':     el  => Inspector.pickVariant(_aStr(el, 'id')),
  'insp.instr':       el  => Inspector.setInstrument(_aStr(el, 'id')),
  'insp.view':        el  => Inspector.setView(_aStr(el, 'id')),
  'insp.add':         el  => Inspector.addDegree(_aInt(el, 'idx')),
  'insp.voice':       el  => Inspector.pickVoice(_aStr(el, 'id')),

  // ── Document (B2) ──
  'doc.save':         ()  => Doc.save(),
  'doc.new':          ()  => Doc.fresh(),
  'doc.open':         ()  => Library.toggle(),
  'doc.rename':       el  => Doc.setName(el.value),

  // ── Rhythm track (B3) ──
  'rhythm.toggle':    ()  => Rhythm.toggle(),
  'rhythm.genre':     el  => Rhythm.setGenre(_aStr(el, 'id')),

  // ── Styles tab (V6.33) ──
  'styles.genre':     el => StylesTab.pick(_aStr(el, 'id')),
  'styles.bpm':       ()  => StylesTab.useBpm(),

  // ── Chord identify (V6.33) ──
  'ident.toggle':     ()  => ChordIdent.toggle(),
  'ident.clear':      ()  => ChordIdent.clear(),

  // ── Tuner (V6.33) ──
  'tuner.open':       ()  => Tuner.open(),
  'tuner.mic':        ()  => Tuner.start(),
  'tuner.close':      ()  => Tuner.close(),

  // ── Misc ──
  'strip.pick':       el => pickProgChord(_aInt(el, 'idx')),
  'strip.pickKey':    el => pickKeyChord(_aInt(el, 'idx')),
  'install.accept':   ()  => _acceptInstall(),
  'install.dismiss':  ()  => _dismissInstall(),
  'dirguide.toggle':  ()  => WheelDirectionGuide.toggle(),
});
