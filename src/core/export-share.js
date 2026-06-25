// ── EXPORT & SHARE (V4.2) ─────────────────────────────
// Two ways to take a progression out of the app: a Standard MIDI File you can
// drop into any DAW, and a shareable link that restores the full state.

// ----- MIDI export -------------------------------------------------------
const _MIDI_TPQ = 480;                       // ticks per quarter note

function _vlq(n) {                           // variable-length quantity
  const bytes = [n & 0x7f]; n >>= 7;
  while (n > 0) { bytes.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return bytes;
}

function _midiNotesForItem(item) {
  // Same voicing the synth plays: chord tones + an octave-down root, mapped so
  // pitch 0 (our "middle C") = MIDI 60.
  const tones = chordPitchesForItem(item);
  if (!tones.length) return [];
  return [tones[0] - 12].concat(tones).map(p => Math.max(0, Math.min(127, 60 + p)));
}

// The chords to take out of the app, with absolute `start` (beats) so gaps and
// off-beat placements survive. Chains A→B (B after A, rounded to whole bars) when
// the song is set to play through; otherwise it's the active section.
function _exportSong() {
  if (st.sections && st.activeSection) st.sections[st.activeSection] = st.history;   // capture edits
  const A = (st.sections && st.sections.A) || st.history || [];
  const B = (st.sections && st.sections.B) || [];
  const end = arr => arr.reduce((m, it) => Math.max(m, (it.start || 0) + Math.max(0.25, it.beats || 2)), 0);
  if (st.chain && A.length && B.length) {
    const off = Math.ceil(end(A) / 4) * 4;          // start B on a whole bar after A
    return A.concat(B.map(it => ({ ...it, start: (it.start || 0) + off })));
  }
  return Array.isArray(st.history) ? st.history : [];
}

function buildMIDI() {
  const song = _exportSong();
  if (!song.length) return null;

  // Absolute-timed events (by each clip's grid start), then emit as deltas.
  const events = [];
  song.forEach(it => {
    const startTick = Math.round(Math.max(0, it.start || 0) * _MIDI_TPQ);
    const dur = Math.round(Math.max(0.25, it.beats || 2) * _MIDI_TPQ);
    _midiNotesForItem(it).forEach(n => {
      events.push({ t: startTick, on: 1, n });
      events.push({ t: startTick + dur, on: 0, n });
    });
  });
  // off-before-on at the same tick so re-struck notes don't hang
  events.sort((a, b) => a.t - b.t || a.on - b.on);

  const track = [];
  // tempo meta
  const uspq = Math.round(60000000 / (st.bpm || 100));
  track.push(0x00, 0xff, 0x51, 0x03, (uspq >> 16) & 0xff, (uspq >> 8) & 0xff, uspq & 0xff);
  // track name
  const name = 'Quinta';
  track.push(0x00, 0xff, 0x03, name.length, ...[...name].map(c => c.charCodeAt(0)));

  let last = 0;
  events.forEach(e => {
    track.push(..._vlq(e.t - last)); last = e.t;
    track.push(e.on ? 0x90 : 0x80, e.n, e.on ? 90 : 0);
  });
  track.push(0x00, 0xff, 0x2f, 0x00);        // end of track

  const trkLen = track.length;
  const header = [
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6,      // MThd, length 6
    0, 0,                                     // format 0
    0, 1,                                     // 1 track
    (_MIDI_TPQ >> 8) & 0xff, _MIDI_TPQ & 0xff,
    0x4d, 0x54, 0x72, 0x6b,                  // MTrk
    (trkLen >> 24) & 0xff, (trkLen >> 16) & 0xff, (trkLen >> 8) & 0xff, trkLen & 0xff,
  ];
  return new Uint8Array(header.concat(track));
}

function exportMIDI() {
  const bytes = buildMIDI();
  if (!bytes) { _shareToast('Add some chords first'); return; }
  if (typeof tel === 'function') tel('export_midi');
  const blob = new Blob([bytes], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'easy-fifth-circle.mid';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  _shareToast('MIDI exported');
}

// ----- Shareable link ----------------------------------------------------
// Encodes key/mode/bpm/7ths + each chord (degree, quality, beats) into the URL
// hash so opening the link rebuilds the exact progression.
function _b64urlEncode(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function _b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(str)));
}

// One chord ↔ a compact array. Index 8 = `start` (grid position) so off-beat and
// gaps survive; older links without it just pack (back-compatible).
function _encChord(it) {
  return [it.chord, it.degree, it.quality, it.degreeIndex, it.note ?? null, it.key, it.mode, it.beats || 2, Math.round((it.start || 0) * 1000) / 1000];
}
function _decChord(r) {
  return {
    chord: r[0], degree: r[1], quality: r[2], degreeIndex: r[3],
    note: r[4] ?? undefined, key: r[5], mode: r[6], beats: r[7] || 2,
    start: typeof r[8] === 'number' ? r[8] : undefined,
    uid: Date.now() + '-' + Math.random().toString(36).slice(2),
  };
}

function buildShareURL() {
  if (st.sections && st.activeSection) st.sections[st.activeSection] = st.history;   // capture edits
  const A = (st.sections && st.sections.A) || st.history || [];
  const B = (st.sections && st.sections.B) || [];
  const payload = {
    k: st.key, m: st.mode, b: st.bpm || 100, s: st.sevenths ? 1 : 0,
    sn: st.snap, ch: st.chain ? 1 : 0, as: st.activeSection === 'B' ? 'B' : 'A',
    A: A.map(_encChord), B: B.map(_encChord),
  };
  const base = location.href.split('#')[0];
  return base + '#p=' + _b64urlEncode(JSON.stringify(payload));
}

function shareProgression() {
  if (typeof tel === 'function') tel('share');
  const url = buildShareURL();
  const done = () => _shareToast('Link copied');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(() => prompt('Copy this link:', url));
  else prompt('Copy this link:', url);
}

// Restore a progression from #p=… on load. Returns true if it applied one.
function applyShareFromURL() {
  const m = location.hash.match(/[#&]p=([^&]+)/);
  if (!m) return false;
  try {
    const d = JSON.parse(_b64urlDecode(m[1]));
    if (d.k) st.key = d.k;
    if (d.m) st.mode = d.m;
    if (d.b) st.bpm = d.b;
    st.sevenths = !!d.s;
    if (typeof d.sn === 'number') st.snap = d.sn;
    if (Array.isArray(d.A) || Array.isArray(d.B)) {
      // New format: full A/B sections with grid positions.
      st.sections = { A: (d.A || []).map(_decChord), B: (d.B || []).map(_decChord) };
      st.activeSection = d.as === 'B' ? 'B' : 'A';
      st.chain = !!d.ch;
    } else {
      // Old format: a flat list → section A (packs, no grid info).
      st.sections = { A: (Array.isArray(d.h) ? d.h : []).map(_decChord), B: [] };
      st.activeSection = 'A';
    }
    st.history = st.sections[st.activeSection];
    saveState();
    return true;
  } catch (_) { return false; }
}

function _shareToast(msg) {
  const toast = document.getElementById('copyToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

// ----- Share-a-loop: opened from a shared link -----------------------------
// Browsers block autoplay, so the loop can't sound on its own — show a banner and
// play it on the first tap (a real user gesture).
function showSharedBanner() {
  const b = document.getElementById('sharedBanner'); if (!b) return;
  const espa = (typeof st === 'object' && st.lang === 'es');
  const set = (cls, txt) => { const el = b.querySelector('.' + cls); if (el) el.textContent = txt; };
  set('sb-title', espa ? 'Alguien te compartió un loop' : 'Someone shared a loop');
  const keyLbl = (typeof displayKeyLabel === 'function') ? displayKeyLabel() : (st.key || '');
  const modeLbl = (typeof gm === 'function' && gm()) ? gm().name : '';
  set('sb-sub', `${keyLbl} ${modeLbl} · ${st.bpm || 100} BPM`.trim());
  set('sb-play', espa ? 'Reproducir' : 'Play');
  b.hidden = false;
  requestAnimationFrame(() => b.classList.add('show'));
  setTimeout(() => document.getElementById('progressionBuilder')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
}
function playSharedLoop() {
  dismissSharedBanner();
  if (typeof AudioEngine === 'object') AudioEngine.resume();      // the tap unlocks audio
  if (typeof toggleProgPlay === 'function') toggleProgPlay();
}
function dismissSharedBanner() {
  const b = document.getElementById('sharedBanner'); if (!b) return;
  b.classList.remove('show');
  setTimeout(() => { b.hidden = true; }, 360);
}
