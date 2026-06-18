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

// Signature degrees that define each mode's colour (Audit §6: mode behaviour).
// These get a boost so a modal context actually sounds modal instead of
// defaulting to the major I–IV–V gravity.
const MODAL_PREFER = {
  dorian:     [3, 6],   // IV (major), ♭VII
  mixolydian: [6, 3],   // ♭VII, IV
  phrygian:   [1, 5],   // ♭II, ♭VI
  lydian:     [1],      // II (raised 4)
  aeolian:    [5, 6],   // ♭VI, ♭VII
};

// ── Progression context ───────────────────────────────
// Gives the engine MEMORY: instead of treating the current chord in isolation,
// it reads the built progression for cadence setups, repetition (vamp/pedal)
// and position. Pure logic — no DOM. (Audit §6: repetition, cadences, position.)
function progressionContext(fromIdx) {
  const h    = Array.isArray(st.history) ? st.history : [];
  const tail = h.map(x => x.degreeIndex);
  const last = tail.length ? tail[tail.length - 1] : fromIdx;
  const prev = tail.length > 1 ? tail[tail.length - 2] : null;
  const mode = st.mode;

  // The suggestions are "from fromIdx". Context only applies when fromIdx is
  // actually the tail of the progression (otherwise the user is just exploring
  // a degree on the wheel and history shouldn't bias it).
  const coherent = h.length > 0 && last === fromIdx;

  // Repetition: how many times the current degree repeats at the tail.
  let repeat = 1;
  if (coherent) { for (let i = tail.length - 2; i >= 0 && tail[i] === last; i--) repeat++; }
  const isVamp = coherent && repeat >= 2;

  // Cadence-in-progress: what is the harmony pulling toward next?
  let expect = null, expectWhy = '';
  if (coherent) {
    if      (prev === 1 && last === 4)                                              { expect = 0; expectWhy = R('exp_iiVI'); }
    else if (prev === 3 && last === 4)                                              { expect = 0; expectWhy = R('exp_IVVI'); }
    else if (prev === 5 && last === 6 && ['aeolian','dorian','phrygian'].includes(mode)) { expect = 0; expectWhy = R('exp_bVI'); }
    else if (last === 4)                                                            { expect = 0; expectWhy = R('exp_Vhome'); }
    else if (last === 6 && mode === 'mixolydian')                                   { expect = 0; expectWhy = R('exp_bVIIres'); }
    else if (last === 6)                                                            { expect = 0; expectWhy = R('exp_viiPull'); }
    else if (last === 1)                                                            { expect = 4; expectWhy = R('exp_iiSetsV'); }
  }

  return { length: h.length, tail, last, prev, repeat, isVamp, expect, expectWhy, coherent };
}

// Bilingual reason phrases. The EN values are kept verbatim so the dev-test
// regexes (resol / ii–V–I / loop) still match; ES preserves those substrings too.
const SUGG_REASONS = {
  exp_iiVI:    { en: 'Completes ii–V–I',       es: 'Completa ii–V–I' },
  exp_IVVI:    { en: 'Completes IV–V–I',       es: 'Completa IV–V–I' },
  exp_bVI:     { en: 'Completes ♭VI–♭VII–i',   es: 'Completa ♭VI–♭VII–i' },
  exp_Vhome:   { en: 'V pulls home to I',      es: 'La V tira a casa (I)' },
  exp_bVIIres: { en: '♭VII resolves to I',     es: '♭VII resuelve en I' },
  exp_viiPull: { en: 'vii° pulls to I',        es: 'vii° tira hacia I' },
  exp_iiSetsV: { en: 'ii sets up V',           es: 'ii prepara la V' },
  loopOpen:    { en: 'Keeps the loop open',    es: 'Mantiene el loop abierto' },
  loopHome:    { en: 'Lands the loop home',    es: 'Cierra el loop en casa' },
  loopLift:    { en: 'Lifts out of the loop',  es: 'Sale del loop con lift' },
  strongRes:   { en: 'Strong resolution',      es: 'Resolución fuerte' },
  setsCad:     { en: 'Sets up the cadence',    es: 'Prepara la cadencia' },
  mixoLift:    { en: 'Mixolydian ♭VII lift',   es: 'Lift mixolidio de ♭VII' },
  dorIV:       { en: 'Dorian major-IV colour', es: 'Color de IV mayor dórico' },
  lydII:       { en: 'Lydian raised-II colour',es: 'Color de II elevada lidio' },
  phryII:      { en: 'Phrygian ♭II colour',    es: 'Color de ♭II frigio' },
  darker:      { en: 'Adds darker colour',     es: 'Añade color más oscuro' },
  home:        { en: 'Returns home',           es: 'Vuelve a casa' },
  warm:        { en: 'Warm colour shift',      es: 'Giro de color cálido' },
  sharpModal:  { en: 'Sharper modal colour',   es: 'Color modal más marcado' },
  moving:      { en: 'Keeps it moving',        es: 'Mantiene el movimiento' },
};
function R(key) { const o = SUGG_REASONS[key]; return o ? (o[st?.lang || 'en'] || o.en) : ''; }

// Short, honest, musical reason for a single move. Audit §6 wants the engine to
// "explain itself simply": Strong resolution / Keeps the loop open / etc.
function suggestionReason(fromIdx, to, ctx, mode) {
  if (ctx.expect === to && ctx.expectWhy)        return ctx.expectWhy;
  if (ctx.isVamp) {
    if (to === ctx.last)                         return R('loopOpen');
    if (to === 0)                                return R('loopHome');
    if ([3,4,5].includes(to))                    return R('loopLift');
  }
  if (fromIdx === 4 && to === 0)                 return R('strongRes');
  if (fromIdx === 1 && to === 4)                 return R('setsCad');
  if (mode === 'mixolydian' && to === 6)         return R('mixoLift');
  if (mode === 'dorian'     && to === 3)         return R('dorIV');
  if (mode === 'lydian'     && to === 1)         return R('lydII');
  if (mode === 'phrygian'   && to === 1)         return R('phryII');
  if (['aeolian','phrygian','dorian'].includes(mode) && to === 5) return R('darker');
  if (to === 0)                                  return R('home');
  if ([3,5].includes(to))                        return R('warm');
  if ([6,1].includes(to))                        return R('sharpModal');
  return R('moving');
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

  context: progressionContext,

  getNextWithScores(fromIdx = curDeg >= 0 ? curDeg : 0) {
    const raw     = SuggestionEngine.next(fromIdx);
    const byTo    = new Map(raw.map(x => [x.to, x]));
    const ctx     = progressionContext(fromIdx);
    return gc().map((c, to) => {
      const base       = byTo.get(to) || { to, why: 'Works as a colour inside this mode.' };
      const transition = transitionProfile(fromIdx, to);
      const validation = validationScore(fromIdx, to, transition);
      const m          = harmonyMetrics(to);

      // Accumulate a RAW score (may exceed 100). We sort by raw so a strong
      // cadence still wins even when several options saturate the 0–100 display
      // range; the shown `fit` is the clamped value.
      let raw = moodFit(to, fromIdx) + (validation.bonus || 0);

      // Modal signature boost so modes sound modal, not major-by-default.
      if ((MODAL_PREFER[st.mode] || []).includes(to)) raw += 16;

      // Genre context: favour each genre's signature palette + cadence style.
      raw += genreFit(to);

      // Look-ahead (2-step): reward moves that OPEN a strong continuation, so the
      // engine prefers e.g. ii (sets up V→I) over a dead-end colour. Reward-only
      // (never penalises a terminal/home chord) so it can't bury a primary cadence.
      raw += Math.max(0, lookaheadScore(to) - 92) * 0.18;

      // Context-aware adjustments (the engine's "memory"):
      if (ctx.expect === to)                       raw += 16; // cadence pull
      if (ctx.isVamp && to === ctx.last)           raw += 6;  // staying is a valid loop
      if (ctx.isVamp && [3,4,5].includes(to))      raw += 4;  // but offer a clean exit
      if (ctx.length <= 1 && fromIdx === 0 && to === 0) raw -= 12; // don't open by sitting on I

      const fit    = clamp(Math.round(raw), 8, 100);
      const reason = suggestionReason(fromIdx, to, ctx, st.mode);
      return { ...base, to, chord: c, transition, validation, m, fit, _raw: raw, reason };
    }).sort((a, b) => b._raw - a._raw);
  },
};
