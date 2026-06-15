// ── RENDER ENGINE ─────────────────────────────────────
// Orchestrates all renders. Mutations only here, not in logic modules.

const RenderEngine = {
  counts: { full:0, wheel:0, theory:0, suggestions:0, history:0 },

  full() {
    this.counts.full++;
    renderWheel();       this.counts.wheel++;
    renderTheory();      this.counts.theory++;
    renderSuggestions(); this.counts.suggestions++;
    HistoryEngine.render(); this.counts.history++;
    renderProgressionStory();
    renderPiano();
    renderGuitar();
    applyI18n();
  },

  partial(set) {
    if (!Array.isArray(set)) return;
    if (set.includes('wheel'))       { renderWheel();       this.counts.wheel++; }
    if (set.includes('theory'))      { renderTheory();      this.counts.theory++; }
    if (set.includes('suggestions')) { renderSuggestions(); this.counts.suggestions++; }
    if (set.includes('history'))     { HistoryEngine.render(); this.counts.history++; renderProgressionStory(); }
    if (set.includes('trails'))      { renderProgressionStory(); }
    if (set.includes('degrees'))     { renderTheory(); }
    if (set.includes('instruments')) { renderPiano(); renderGuitar(); }
  },
};
