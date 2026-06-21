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

function buildMIDI() {
  const h = Array.isArray(st.history) ? st.history : [];
  if (!h.length) return null;

  // Absolute-timed events, then emit as deltas.
  const events = [];
  let tick = 0;
  h.forEach(it => {
    const dur = Math.round(Math.max(1, it.beats || 2) * _MIDI_TPQ);
    _midiNotesForItem(it).forEach(n => {
      events.push({ t: tick, on: 1, n });
      events.push({ t: tick + dur, on: 0, n });
    });
    tick += dur;
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

function buildShareURL() {
  const h = Array.isArray(st.history) ? st.history : [];
  const payload = {
    k: st.key, m: st.mode, b: st.bpm || 100, s: st.sevenths ? 1 : 0,
    h: h.map(it => [it.chord, it.degree, it.quality, it.degreeIndex, it.note ?? null, it.key, it.mode, it.beats || 2]),
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
    st.history = (Array.isArray(d.h) ? d.h : []).map(r => ({
      chord: r[0], degree: r[1], quality: r[2], degreeIndex: r[3],
      note: r[4] ?? undefined, key: r[5], mode: r[6], beats: r[7] || 2,
      uid: Date.now() + '-' + Math.random().toString(36).slice(2),
    }));
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
