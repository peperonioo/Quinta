// ── HARMONY ENGINE ────────────────────────────────────
// Calculates harmonic gravity, metrics, transitions.
// Pure logic — no DOM access.

const MOOD_PROFILES = {
  balanced: {label:'Balanced', desc:'Neutral movement: home, lift and tension.',  prefer:[0,3,4], avoid:[]},
  dreamy:   {label:'Dreamy',   desc:'Soft colour, suspended movement.',            prefer:[2,5,3], avoid:[6]},
  uplift:   {label:'Uplift',   desc:'Brighter routes, forward energy.',            prefer:[3,6,0], avoid:[1]},
  dark:     {label:'Darker',   desc:'Moodier choices, cinematic falls.',           prefer:[5,6,1], avoid:[0]},
  soul:     {label:'Soulful',  desc:'Smooth voice-leading, groove-friendly.',      prefer:[1,3,5], avoid:[6]},
  tension:  {label:'Tension',  desc:'More pull before release.',                   prefer:[4,6,1], avoid:[0]},
  floating: {label:'Floating', desc:'Open space, fewer hard cadences.',            prefer:[3,1,6], avoid:[4]},
};

const GRAVITY_ARCHETYPES = [
  {name:'Resolution', tension:18, stability:96, brightness:72, darkness:18, movement:26, resolution:96, surprise:12},
  {name:'Prepare',    tension:48, stability:58, brightness:52, darkness:42, movement:68, resolution:50, surprise:35},
  {name:'Colour',     tension:36, stability:62, brightness:56, darkness:40, movement:42, resolution:46, surprise:52},
  {name:'Lift',       tension:42, stability:72, brightness:76, darkness:22, movement:62, resolution:58, surprise:30},
  {name:'Tension',    tension:82, stability:44, brightness:60, darkness:38, movement:88, resolution:24, surprise:20},
  {name:'Emotion',    tension:54, stability:66, brightness:36, darkness:68, movement:54, resolution:52, surprise:38},
  {name:'Edge',       tension:92, stability:24, brightness:44, darkness:62, movement:82, resolution:18, surprise:72},
];

function degreeWeight(idx) {
  const role  = ['Resolution / home','Connector','Colour','Lift','Tension','Emotion','Instability'][idx] || 'Colour';
  const score = [95,62,48,70,90,66,84][idx] || 60;
  return { score, role };
}

function harmonicGravity(idx) {
  const q = gc()[idx]?.quality || 'Maj';
  const g = { ...GRAVITY_ARCHETYPES[(idx + 7) % 7] };
  if (q === 'Min') { g.darkness += 8; g.brightness -= 5; g.tension += 4; }
  if (q === 'Dim') { g.tension  += 10; g.stability -= 12; g.surprise += 10; }
  if (['dorian','mixolydian','lydian'].includes(st.mode))   { g.brightness += 5; g.surprise += 4; }
  if (['aeolian','phrygian','locrian'].includes(st.mode))   { g.darkness += 8; g.brightness -= 5; }
  Object.keys(g).forEach(k => { if (k !== 'name') g[k] = clamp(g[k]); });
  g.weight = degreeWeight(idx).score;
  g.role   = degreeWeight(idx).role;
  return g;
}

function harmonyMetrics(idx) {
  const g = harmonicGravity(idx);
  return {
    weight:g.weight, tension:g.tension, stability:g.stability,
    colour:clamp((g.surprise + g.darkness + g.tension) / 3),
    role:g.role, brightness:g.brightness, darkness:g.darkness,
    movement:g.movement, resolution:g.resolution, surprise:g.surprise, name:g.name,
  };
}

function transitionProfile(fromIdx, toIdx) {
  const a = harmonicGravity(fromIdx), b = harmonicGravity(toIdx);
  const delta = (toIdx - fromIdx + 7) % 7;
  let category = 'Motion', route = 'Balanced motion', score = 55;
  if (fromIdx === 4 && toIdx === 0) { category = 'Resolve';   route = 'Classic V → I resolution';      score = 92; }
  else if (fromIdx === 1 && toIdx === 4) { category = 'Tension';   route = 'Pre-dominant → dominant';  score = 86; }
  else if (toIdx === 0)                  { category = 'Resolve';   route = 'Back to the key centre';   score = 76; }
  else if ([3,5].includes(toIdx))        { category = 'Lift';      route = 'Warm colour shift';        score = 68; }
  else if ([6,1].includes(toIdx))        { category = 'Surprise';  route = 'Sharper modal colour';     score = 62; }
  else if (delta === 4 || delta === 3)   { category = 'Motion';    route = 'Fifth-style movement';     score = 72; }
  score += Math.round((b.movement - a.stability) * 0.08);
  return { category, route, score: clamp(score) };
}

function moodFit(idx, fromIdx = curDeg >= 0 ? curDeg : 0) {
  const p  = MOOD_PROFILES[st.mood || 'balanced'] || MOOD_PROFILES.balanced;
  const g  = harmonicGravity(idx);
  const tr = transitionProfile(fromIdx, idx);
  let score = 42 + tr.score * 0.24;
  if (p.prefer.includes(idx)) score += 26;
  if (p.avoid.includes(idx))  score -= 16;
  const mood = st.mood || 'balanced';
  if (mood === 'tension')  score += g.tension * 0.22   + g.movement * 0.12;
  if (mood === 'uplift')   score += g.brightness * 0.18 + g.stability * 0.08;
  if (mood === 'dark')     score += g.darkness * 0.22  + g.surprise * 0.08;
  if (mood === 'soul')     score += ([1,3,5].includes(idx) ? 20 : 0) + Math.max(0, 80 - g.tension) * 0.06;
  if (mood === 'dreamy')   score += g.surprise * 0.14  + Math.max(0, 80 - g.tension) * 0.10;
  if (mood === 'floating') score += g.surprise * 0.12  + g.brightness * 0.08 - (idx === 4 ? 12 : 0);
  if (mood === 'balanced') score += (100 - Math.abs(58 - g.weight)) * 0.10;
  return clamp(score);
}

function moodReason(base, idx, fromIdx = curDeg >= 0 ? curDeg : 0) {
  const tr = transitionProfile(fromIdx, idx);
  const m  = st.mood || 'balanced';
  if (m === 'dreamy')   return `${tr.route}. Softer colour, less obvious than a hard cadence.`;
  if (m === 'uplift')   return `${tr.route}. Brighter option with forward motion.`;
  if (m === 'dark')     return `${tr.route}. Darker colour, useful for moodier loops.`;
  if (m === 'soul')     return `${tr.route}. Smooth, groove-friendly movement.`;
  if (m === 'tension')  return `${tr.route}. Adds pull before resolving.`;
  if (m === 'floating') return `${tr.route}. Keeps the harmony open and modal.`;
  return base || tr.route;
}

function validationScore(from, to, tr) {
  const mode = st.mode;
  let bonus = 0;
  const reasons = [];
  if (from === 1 && to === 4) { bonus += 10; reasons.push('classic ii→V cadence'); }
  if (from === 4 && to === 0) { bonus += 14; reasons.push('strong V→I resolution'); }
  if (from === 3 && to === 0) { bonus += 8;  reasons.push('soft IV→I landing'); }
  if (['aeolian','dorian','phrygian'].includes(mode) && to === 5) { bonus += 7;  reasons.push('minor colour pillar'); }
  if (mode === 'dorian'     && to === 3) { bonus += 11; reasons.push('Dorian major-IV colour'); }
  if (mode === 'mixolydian' && to === 6) { bonus += 11; reasons.push('Mixolydian bVII signature'); }
  if (mode === 'lydian'     && to === 1) { bonus += 11; reasons.push('Lydian raised-II colour'); }
  if (curGenre === 'house'   && [0,3,6].includes(to)) { bonus += 4; reasons.push('loop-friendly for house'); }
  if (curGenre === 'neosoul' && [1,4,5].includes(to)) { bonus += 5; reasons.push('works well with extended voicings'); }
  return { bonus, reason: reasons[0] || tr.route };
}

function categoryClass(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('resolve'))  return 'resolve';
  if (c.includes('tension'))  return 'tension';
  if (c.includes('lift'))     return 'lift';
  if (c.includes('surprise')) return 'surprise';
  return 'motion';
}

function friendlyCategory(cat) {
  if (!cat) return 'Motion';
  const c = String(cat).toLowerCase();
  if (c.includes('resolve'))  return 'Resolve';
  if (c.includes('lift'))     return 'Lift';
  if (c.includes('dark'))     return 'Darken';
  if (c.includes('surprise')) return 'Surprise';
  if (c.includes('float'))    return 'Float';
  return 'Motion';
}

const HarmonyEngine = {
  degreeAngle: (idx) => idx * 30,
  gravity:     harmonicGravity,
  metrics:     harmonyMetrics,
  transition:  transitionProfile,
  moodFit,
  validationScore,
};
