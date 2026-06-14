// ── UTILS ─────────────────────────────────────────────
// Pure helpers. No DOM access. No direct state mutation.

const stripMinorSuffix = (key) => String(key || 'C').replace(/m$/, '');

const ni = n => { const i = NOTES.indexOf(n); return i >= 0 ? i : (ENH[n] ?? 0); };
const na = i => NOTES[(i + 120) % 12];
const dn = n => (['Ab','Bb','Db','Eb','Gb'].includes(n) ? n : (FM[n] || n));

const gm  = ()  => MODES.find(m => m.id === st.mode);

// V4.5 — the wheel + its info cards follow ONLY Major/Minor (st.tonality); the
// selected mode recolours the degrees / suggestions / progression but never
// moves the circle. wheelMode() is the ionian/aeolian base for the wheel.
const wheelMode = () => (st.tonality === 'minor' ? 'aeolian' : 'ionian');
const wmObj     = () => MODES.find(m => m.id === wheelMode());

// Wheel + scale-notes card scale (Major or Minor only).
const gs  = ()  => { const r = ni(st.key); return wmObj().intervals.map(i => dn(na(r + i))); };
// Mode scale — drives the degree row, suggestions and built chords.
const modeScale = () => { const r = ni(st.key); return gm().intervals.map(i => dn(na(r + i))); };
const gr  = ()  => { const r = ni(st.key); return gm().intervals.map(i => na(r + i)); };
const gc  = ()  => { const s = modeScale(), m = gm(); return s.map((n, i) => ({ degree: m.degrees[i], note: n, quality: m.qualities[i], chord: n + (m.qualities[i] === 'Min' ? 'm' : m.qualities[i] === 'Dim' ? '°' : '') })); };

// The relative key shown on the side card: relative MAJOR when minor, relative
// MINOR when major — derived from the sector (always Major/Minor, not the mode).
const grel = () => {
  const sector = parentMajor(st.key, wheelMode());
  if (st.tonality === 'minor') return sector + ' ' + t('common.major');
  const relRoot = stripMinorSuffix(relativeMinor(sector) || '');
  return (relRoot ? spellForSector(ni(relRoot), sector) : '') + ' ' + t('common.minor');
};

// Roman numeral cased by chord quality: major = UPPERCASE, minor/dim = lowercase
// (dim keeps its °). Shared by the degree row, suggestion bubbles and builder.
function casedRoman(roman, q) {
  let r = q === 'Maj' ? String(roman).toUpperCase() : String(roman).toLowerCase();
  if (q === 'Dim' && !r.includes('°')) r += '°';
  return r;
}

function clamp(v, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(v))); }

function modeFriendly(id) {
  return (MODE_FRIENDLY[st.lang || 'en'] || MODE_FRIENDLY.en)[id] || [id, ''];
}

// ── Unified key/mode model (V4.3) ─────────────────────
// Single source of truth: st.key = the TONIC note, st.mode = the mode. The
// "sector" (parent-major key signature) is derived, and st.wheelView is just a
// mirror of whether the mode is minor — never an independent control.

const modeIsMinor   = mode => MINOR_MODES.has(mode);
const fifthsIndexOf = note => ((ni(note) * 7) % 12 + 12) % 12;

// The parent-major key (FIFTHS sector) for a given tonic + mode.
function parentMajor(tonic, mode) {
  const idx = ((fifthsIndexOf(tonic) + (MODE_FIFTHS_OFF[mode] ?? 0)) % 12 + 12) % 12;
  return FIFTHS[idx];
}

// Spell a pitch class to match the sector's signature (flats in flat keys).
function spellForSector(pitch, sectorMajor) {
  const sharp = na(((pitch % 12) + 12) % 12);
  return FLAT_KEYS.has(sectorMajor) ? (FM[sharp] || sharp) : sharp;
}

// The tonic note when the active sector is `sectorMajor` and the mode is `mode`.
// (Ionian keeps the sector's own nicely-spelled name.)
function tonicForSectorMode(sectorMajor, mode) {
  const deg = MODE_SECTOR_DEG[mode] ?? 0;
  if (deg === 0) return sectorMajor;
  return spellForSector(ni(sectorMajor) + IONIAN_STEPS[deg], sectorMajor);
}

// Set the Major/Minor base + mode together (used for test setup / quick jumps).
function applyKeyMode(tonic, mode) {
  st.key = tonic;
  st.mode = mode;
  st.tonality = modeIsMinor(mode) ? 'minor' : 'major';
  st.wheelView = st.tonality;
}

function normalizeKeyState() {
  if (!st.key) st.key = 'C';
  // Legacy state migration: a minor-suffixed key ('Am') becomes its plain tonic
  // ('A') with a minor tonality.
  if (typeof st.key === 'string' && /m$/.test(st.key) && MINOR_ROOTS.has(st.key)) {
    st.key = stripMinorSuffix(st.key);
    st.tonality = 'minor';
    if (!modeIsMinor(st.mode)) st.mode = 'aeolian';
  }
  if (!(NOTES.includes(st.key) || (st.key in ENH))) st.key = 'C';
  if (!gm()) st.mode = 'ionian';
  // tonality (Major/Minor base) is independent of the chosen mode; seed it from
  // the mode only when missing.
  if (st.tonality !== 'major' && st.tonality !== 'minor') st.tonality = modeIsMinor(st.mode) ? 'minor' : 'major';
  st.wheelView = st.tonality;
}

// The FIFTHS (major) key whose SECTOR the wheel highlights — driven by the
// Major/Minor base, NOT the mode (modes never move the circle).
function wheelKey()  { return parentMajor(st.key, wheelMode()); }
function anchorKey() { return parentMajor(st.key, wheelMode()); }

// The tonic, spelled for its sector — the big centre label.
function displayKeyLabel() {
  return spellForSector(ni(st.key), parentMajor(st.key, wheelMode()));
}

function metricClass(value) {
  const v = clamp(value);
  return v >= 78 ? 'high' : v >= 55 ? 'medium' : 'soft';
}

function metricPill(label, value) {
  const v = clamp(value), cls = metricClass(v);
  return `<span class="gravity-pill metric ${cls}">${label} ${v}</span>`;
}

// SVG helpers — used by both wheel-renderer and direction-guide
const NS = 'http://www.w3.org/2000/svg';
function se(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
function polar(r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [300 + r * Math.cos(a), 300 + r * Math.sin(a)];
}
