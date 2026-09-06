// ── UTILS ─────────────────────────────────────────────
// Pure helpers. No DOM access. No direct state mutation.

const stripMinorSuffix = (key) => String(key || 'C').replace(/m$/, '');

// A note name is PARSED, never looked up: a letter plus any run of ♯/♭. The
// table this replaced knew only the twelve sharp names and five flats, so a
// correctly spelled scale degree (F♯ major ends on E♯, F Locrian on C♭) came
// back as pitch class 0 — silently the wrong root, the wrong chord, the wrong
// key lit on the keyboard. Anything the speller below can write, this reads.
const LETTER_PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const ni = n => {
  const s = String(n == null ? '' : n).trim();
  let pc = LETTER_PC[s.charAt(0).toUpperCase()];
  if (pc == null) return 0;
  for (let i = 1; i < s.length; i++) {
    const c = s.charAt(i);
    if (c === '#' || c === '♯') pc++;
    else if (c === 'b' || c === '♭') pc--;
  }
  return ((pc % 12) + 12) % 12;
};
const na = i => NOTES[(i + 120) % 12];
// Spell ONE pitch class the way the ACTIVE key signature spells it. The old
// table was flat-biased and unconditional, which is why G major displayed a G♭
// where its F♯ belongs — on the scale card, the degree row and every chord name
// derived from it. Naturals are never touched.
const keyUsesFlats = () => { try { return FLAT_KEYS.has(wheelKey()); } catch (_) { return false; } };
const dn = n => { const s = na(ni(n)); return (s.length > 1 && keyUsesFlats()) ? (FM[s] || s) : s; };

// ── Scale spelling ────────────────────────────────────
// A scale uses each letter exactly once, in order: F♯ major is F♯ G♯ A♯ B C♯ D♯
// E♯ — never …F. So the seven names are DERIVED (letter from the degree,
// accidental from the distance to that letter's natural), not looked up.
const LETTERS = ['C','D','E','F','G','A','B'];
const ENH_TONIC = { 'C#':'Db','Db':'C#','D#':'Eb','Eb':'D#','F#':'Gb','Gb':'F#','G#':'Ab','Ab':'G#','A#':'Bb','Bb':'A#' };
const accStr = a => a === 0 ? '' : a > 0 ? '#'.repeat(a) : 'b'.repeat(-a);

function _spellAttempt(tonic, intervals) {
  const li = LETTERS.indexOf(String(tonic == null ? '' : tonic).charAt(0).toUpperCase());
  if (li < 0) return null;
  const pc0 = ni(tonic);
  let worst = 0;
  const names = intervals.map((iv, d) => {
    const letter = LETTERS[(li + d) % 7];
    // Fold into [-6..5] so the accidental is the SHORTEST way to that letter.
    const alt = ((((pc0 + iv) % 12) - LETTER_PC[letter] + 18) % 12) - 6;
    if (Math.abs(alt) > worst) worst = Math.abs(alt);
    return letter + accStr(alt);
  });
  return { names, worst };
}

// Double accidentals are strictly correct and practically unreadable (A♯ Lydian
// truly needs D𝄪). Where they appear the enharmonic tonic is tried first — B♭
// Lydian says the same thing with single accidentals, which is what a musician
// would actually write.
function spellScale(tonic, intervals) {
  const a = _spellAttempt(tonic, intervals);
  if (a && a.worst <= 1) return a.names;
  const b = _spellAttempt(ENH_TONIC[tonic], intervals);
  if (b && b.worst <= 1) return b.names;
  if (!a) return b ? b.names : intervals.map(iv => na(ni(tonic) + iv));
  return (!b || a.worst <= b.worst) ? a.names : b.names;
}

const gm  = ()  => MODES.find(m => m.id === st.mode);

// ── TONALITY / MODE MODEL (contract) ─────────────────────────────────────────
// State (single source of truth):
//   st.key       the TONIC note (a plain note name, e.g. 'C', 'A', 'Bb').
//   st.tonality  the Major/Minor base of the circle: 'major' | 'minor'.
//   st.mode      the active church mode ('ionian'…'locrian') — a *flavour*.
//   st.wheelView mirrors st.tonality (kept in sync; never set independently).
//
// Two layers, decoupled on purpose so modes can't confuse the circle:
//   • CIRCLE  (wheel + centre + accidentals + scale-notes + relative card) is
//     driven ONLY by st.tonality via wheelMode() → ionian (major) / aeolian
//     (minor). It uses gs() and never reads st.mode.
//   • CHORDS  (degree row + suggestions + built progression) are driven by
//     st.mode via gc()/modeScale()/gr(), parallel on the same st.key.
//
// Operations (actions.js):
//   SET_WHEEL_VIEW  toggle = the base tonality. Sets st.tonality, moves the
//                   tonic to the sector's major / relative-minor, and resets the
//                   mode to ionian/aeolian (same sector → the wheel never jumps).
//   SET_MODE        dropdown = a parallel flavour. Sets st.mode only; key,
//                   tonality and the whole circle stay put.
//   SET_KEY         a wheel click re-roots the tonic per wheelMode(); mode kept.
// ─────────────────────────────────────────────────────────────────────────────
const wheelMode = () => (st.tonality === 'minor' ? 'aeolian' : 'ionian');
const wmObj     = () => MODES.find(m => m.id === wheelMode());

// Wheel + scale-notes card scale (Major or Minor only). Spelled from the tonic
// as the wheel names it, so the notes always agree with the accidentals card.
const gs  = ()  => spellScale(displayKeyLabel(), wmObj().intervals);
// Mode scale — drives the degree row, suggestions and built chords.
const modeScale = () => spellScale(displayKeyLabel(), gm().intervals);
const gr  = ()  => { const r = ni(st.key); return gm().intervals.map(i => na(r + i)); };
const gc  = ()  => { const s = modeScale(), m = gm(); return s.map((n, i) => ({ degree: m.degrees[i], note: n, quality: m.qualities[i], chord: n + (m.qualities[i] === 'Min' ? 'm' : m.qualities[i] === 'Dim' ? '°' : '') })); };

// Diatonic triads of the Major/Minor wheel scale (qualities from ionian/aeolian).
// Drives the chord-lock highlight: which pitch classes are I/IV/V (Maj), ii/iii/vi
// (Min) and vii°/ii° (Dim). Returns [{pc, quality}] for the 7 scale degrees.
const wheelDiatonicChords = () => { const m = wmObj(), notes = gs(); return notes.map((n, i) => ({ pc: ni(n), quality: m.qualities[i] })); };

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

// ── Instrument-pack ownership ─────────────────────────
function packOwned(id) { const d = (typeof PACKS === 'object') && PACKS[id]; return !!d && (d.free || !!((st && st.packs) || {})[id]); }
function voicePackId(v) { if (typeof PACKS !== 'object') return null; for (const id in PACKS) if (PACKS[id].voices.includes(v)) return id; return null; }
