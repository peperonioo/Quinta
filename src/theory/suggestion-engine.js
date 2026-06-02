// ── SUGGESTION ENGINE ─────────────────────────────────
// Generates next-chord suggestions. No DOM access.

const HARMONY_SUGGESTION_DATA = {
  functional: {
    0:[{to:3,label:'Lift',why:'Move away from home without creating too much tension.'},{to:4,label:'Tension',why:'Classic dominant pull.'},{to:5,label:'Emotion',why:'Relative colour. Softer and more reflective.'}],
    1:[{to:4,label:'Prepare',why:'ii → V is the cleanest pre-dominant to dominant motion.'},{to:3,label:'Soften',why:'Moves sideways into a warmer colour.'},{to:0,label:'Reset',why:'Drops back home for a simple loop.'}],
    2:[{to:5,label:'Colour chain',why:'iii → vi feels smooth and cinematic.'},{to:3,label:'Open',why:'iii → IV adds brightness.'},{to:0,label:'Back home',why:'A gentle way to return to the tonic.'}],
    3:[{to:4,label:'Build',why:'IV → V increases forward motion.'},{to:0,label:'Amen',why:'IV → I is soft and peaceful.'},{to:1,label:'Jazz route',why:'IV can pivot into ii before a stronger cadence.'}],
    4:[{to:0,label:'Resolve',why:'V → I is the strongest resolution.'},{to:5,label:'Deceptive',why:'V → vi avoids the obvious landing.'},{to:3,label:'Loop back',why:'V → IV keeps the loop open.'}],
    5:[{to:3,label:'Pop lift',why:'vi → IV is emotional but stable.'},{to:1,label:'Descend',why:'vi → ii creates a smooth pre-dominant movement.'},{to:0,label:'Bittersweet',why:'vi → I returns home with less drama.'}],
    6:[{to:0,label:'Resolve',why:'vii° → I gives maximum pull into the key centre.'},{to:4,label:'Intensify',why:'vii° → V keeps the tension alive.'},{to:5,label:'Fall',why:'A darker downward move.'}],
  },
  modal: {
    dorian:     {0:[{to:3,label:'Dorian signature',why:'i → IV is the soulful Dorian sound.'},{to:6,label:'Open loop',why:'i → ♭VII keeps it modal.'},{to:1,label:'Smooth',why:'i → ii keeps movement subtle.'}],
                 3:[{to:0,label:'Return',why:'IV → i resolves without sounding classical.'},{to:6,label:'Soulful',why:'IV → ♭VII is open and groove-friendly.'},{to:4,label:'Hold',why:'IV → v stays minor and suspended.'}]},
    phrygian:   {0:[{to:1,label:'Phrygian colour',why:'i → ♭II is the defining dark/Spanish movement.'},{to:5,label:'Cinematic',why:'i → ♭VI gives a wider dramatic colour.'},{to:3,label:'Dark vamp',why:'i → iv stays brooding.'}],
                 1:[{to:0,label:'Resolve',why:'♭II → i is the core Phrygian cadence.'},{to:5,label:'Expand',why:'♭II → ♭VI sounds dramatic.'},{to:3,label:'Shadow',why:'♭II → iv keeps the palette dark.'}]},
    lydian:     {0:[{to:1,label:'Lydian lift',why:'I → II instantly shows the raised-four colour.'},{to:4,label:'Resolve softly',why:'I → V stays bright.'},{to:5,label:'Warmth',why:'I → vi adds human emotion.'}],
                 1:[{to:0,label:'Float back',why:'II → I is the clean Lydian colour loop.'},{to:4,label:'Bright drive',why:'II → V keeps the harmony elevated.'},{to:2,label:'Gentle colour',why:'II → iii softens the brightness.'}]},
    mixolydian: {0:[{to:6,label:'Mixo signature',why:'I → ♭VII is the classic bluesy/modal move.'},{to:3,label:'Lift',why:'I → IV is strong without becoming classical.'},{to:4,label:'Suspend',why:'I → v keeps the dominant feeling unresolved.'}],
                 6:[{to:0,label:'Back home',why:'♭VII → I is the core Mixolydian resolution.'},{to:3,label:'Anthem',why:'♭VII → IV feels big and open.'},{to:4,label:'Keep moving',why:'♭VII → v stays modal.'}]},
    aeolian:    {0:[{to:5,label:'Minor pillar',why:'i → ♭VI is emotional and cinematic.'},{to:6,label:'Lift',why:'i → ♭VII opens the loop.'},{to:3,label:'Dark drive',why:'i → iv keeps the feeling grounded.'}],
                 5:[{to:6,label:'Classic minor climb',why:'♭VI → ♭VII sets up a strong return to i.'},{to:0,label:'Fall home',why:'♭VI → i is direct and emotional.'},{to:3,label:'Darker',why:'♭VI → iv deepens the mood.'}]},
  },
};

function nextChordIdeas(fromIdx) {
  const modal = HARMONY_SUGGESTION_DATA.modal[st.mode]?.[fromIdx];
  return modal || HARMONY_SUGGESTION_DATA.functional[fromIdx] || HARMONY_SUGGESTION_DATA.functional[0];
}

const SuggestionEngine = {
  next(fromIdx) {
    const all = new Map();
    (HARMONY_SUGGESTION_DATA.functional[fromIdx] || []).forEach(it => all.set(it.to, it));
    const modal = HARMONY_SUGGESTION_DATA.modal[st.mode]?.[fromIdx];
    if (modal) modal.forEach(it => all.set(it.to, it));
    return [...all.values()];
  },

  progressions() {
    const mode = st.mode;
    const base = [
      {idx:[0,3,4,0], tag:'I – IV – V – I: classic cadence'},
      {idx:[1,4,0],   tag:'ii – V – I: jazz / neo-soul staple'},
      {idx:[0,5,3,4], tag:'I – vi – IV – V: pop rotation'},
      {idx:[0,4,5,3], tag:'I – V – vi – IV: anthemic pop'},
      {idx:[5,3,0,4], tag:'vi – IV – I – V: emotional minor'},
      {idx:[1,6,0,4], tag:'ii – vii° – I – V: baroque line'},
    ];
    if (mode === 'dorian')     base.unshift({idx:[0,3,0,6], tag:'i – IV – i – ♭VII: Dorian groove'});
    if (mode === 'mixolydian') base.unshift({idx:[0,6,3,0], tag:'I – ♭VII – IV – I: Mixolydian rock'});
    if (mode === 'phrygian')   base.unshift({idx:[0,1,0,3], tag:'i – ♭II – i – iv: Phrygian vamp'});
    if (mode === 'lydian')     base.unshift({idx:[0,1,4,0], tag:'I – II – V – I: Lydian lift'});
    return base;
  },

  getNextWithScores(fromIdx = curDeg >= 0 ? curDeg : 0) {
    const raw     = SuggestionEngine.next(fromIdx);
    const byTo    = new Map(raw.map(x => [x.to, x]));
    return gc().map((c, to) => {
      const base       = byTo.get(to) || { to, why: 'Works as a colour inside this mode.' };
      const transition = transitionProfile(fromIdx, to);
      const validation = validationScore(fromIdx, to, transition);
      const m          = harmonyMetrics(to);
      const fit        = clamp(Math.round(moodFit(to, fromIdx) + (validation.bonus || 0)), 8, 100);
      return { ...base, to, chord: c, transition, validation, m, fit };
    }).sort((a, b) => b.fit - a.fit);
  },
};
