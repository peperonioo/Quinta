// ── UTILS ─────────────────────────────────────────────
// Pure helpers. No DOM access. No direct state mutation.

const stripMinorSuffix = (key) => String(key || 'C').replace(/m$/, '');

const ni = n => { const i = NOTES.indexOf(n); return i >= 0 ? i : (ENH[n] ?? 0); };
const na = i => NOTES[(i + 120) % 12];
const dn = n => (['Ab','Bb','Db','Eb','Gb'].includes(n) ? n : (FM[n] || n));

const gm  = ()  => MODES.find(m => m.id === st.mode);
const gs  = ()  => { const r = ni(st.key); return gm().intervals.map(i => dn(na(r + i))); };
const gr  = ()  => { const r = ni(st.key); return gm().intervals.map(i => na(r + i)); };
const gc  = ()  => { const s = gs(), m = gm(); return s.map((n, i) => ({ degree: m.degrees[i], note: n, quality: m.qualities[i], chord: n + (m.qualities[i] === 'Min' ? 'm' : m.qualities[i] === 'Dim' ? '°' : '') })); };
const grel = () => {
  const r = ni(st.key);
  if (st.mode === 'ionian')  return dn(na(r + 9)) + ' ' + t('common.minor');
  if (st.mode === 'aeolian') return dn(na(r + 3)) + ' ' + t('common.major');
  return dn(na(r)) + ' ' + gm().name;
};

function clamp(v, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(v))); }

function modeFriendly(id) {
  return (MODE_FRIENDLY[st.lang || 'en'] || MODE_FRIENDLY.en)[id] || [id, ''];
}

function normalizeKeyState() {
  if (!st.key) st.key = 'C';
  const isMinorRoot = MINOR_ROOTS.has(st.key);
  const isMajorRoot = MAJOR_ROOTS.has(stripMinorSuffix(st.key));
  if (!isMajorRoot && !isMinorRoot) st.key = 'C';
  if (st.wheelView === 'minor' && !isMinorRoot) {
    const rel = REL[stripMinorSuffix(st.key)];
    if (rel) st.key = rel;
  }
  if (st.wheelView === 'major' && isMinorRoot) {
    const maj = MINOR_ROOT_TO_MAJOR[st.key];
    if (maj) st.key = maj;
  }
}

function anchorKey() {
  if (st.wheelView === 'minor') return stripMinorSuffix(st.key);
  return stripMinorSuffix(st.key);
}

// The FIFTHS (major) key whose SECTOR the current selection occupies. In minor
// view a minor key (e.g. Am) is shown on the sector of its relative major (C),
// so the wheel must rotate/highlight by that sector — not by the minor root's
// own major position, which sent the wheel to the wrong sector.
function wheelKey() {
  if (st.wheelView === 'minor') {
    return MINOR_ROOT_TO_MAJOR[st.key]
        || MINOR_ROOT_TO_MAJOR[stripMinorSuffix(st.key) + 'm']
        || stripMinorSuffix(st.key);
  }
  return stripMinorSuffix(st.key);
}

function displayKeyLabel() {
  if (st.wheelView === 'minor') {
    const root = stripMinorSuffix(st.key);
    const rel = MINOR_ROOT_TO_MAJOR[st.key] || MINOR_ROOT_TO_MAJOR[root + 'm'];
    return rel ? dn(rel) : dn(root);
  }
  return dn(stripMinorSuffix(st.key));
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
