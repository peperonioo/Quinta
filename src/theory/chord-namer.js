// ── CHORD NAMER (V6.33) ───────────────────────────────
// Names a chord from raw pitches — the engine behind "what chord is this?" on
// the fretboard. Pure: pitch classes in, ranked names out, no DOM.
//
// Matching is EXACT on the pitch-class set: every note you fretted is part of
// the name, and every note the name implies is on the board. No fuzzy "close
// enough" — a tool you check your own fingers against must not guess.
const ChordNamer = (() => {
  // Interval templates from the root, in priority order: when two names fit the
  // same notes (Am7 and C6 are the same four pitch classes), the earlier
  // template wins the top spot for the root that matches the bass.
  const TEMPLATES = [
    ['',      [0, 4, 7]],
    ['m',     [0, 3, 7]],
    ['dim',   [0, 3, 6]],
    ['aug',   [0, 4, 8]],
    ['sus2',  [0, 2, 7]],
    ['sus4',  [0, 5, 7]],
    ['7',     [0, 4, 7, 10]],
    ['maj7',  [0, 4, 7, 11]],
    ['m7',    [0, 3, 7, 10]],
    ['6',     [0, 4, 7, 9]],
    ['m6',    [0, 3, 7, 9]],
    ['mMaj7', [0, 3, 7, 11]],
    ['dim7',  [0, 3, 6, 9]],
    ['m7b5',  [0, 3, 6, 10]],
    ['add9',  [0, 2, 4, 7]],
    ['madd9', [0, 2, 3, 7]],
    ['7sus4', [0, 5, 7, 10]],
    ['aug7',  [0, 4, 8, 10]],
    ['9',     [0, 2, 4, 7, 10]],
    ['maj9',  [0, 2, 4, 7, 11]],
    ['m9',    [0, 2, 3, 7, 10]],
    ['6/9',   [0, 2, 4, 7, 9]],
    ['7b9',   [0, 1, 4, 7, 10]],
    ['7#9',   [0, 3, 4, 7, 10]],
    ['5',     [0, 7]],
    // ── Omitted-fifth voicings ────────────────────────
    // "Exact, never guess" over-rotated: it demanded the 5th, and guitarists
    // omit it CONSTANTLY — shell voicings (root·3rd·7th) are the bread of
    // rhythm playing, and C·E·C on the board is simply C. The 5th adds no
    // identity to these qualities, so naming without it is still exact.
    // They sit after the full templates; the size gate means a full voicing
    // can never be shadowed by its shell.
    ['',      [0, 4]],
    ['m',     [0, 3]],
    ['7',     [0, 4, 10]],
    ['maj7',  [0, 4, 11]],
    ['m7',    [0, 3, 10]],
    ['mMaj7', [0, 3, 11]],
    ['9',     [0, 2, 4, 10]],
    ['m9',    [0, 2, 3, 10]],
  ];

  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pc = n => ((n % 12) + 12) % 12;

  // pitches: absolute pitches (any octave); the LOWEST one is the bass, which
  // breaks ties between enharmonic names (Am7 in the hand vs C6 on paper) and
  // produces slash names when the bass is not the root.
  // → [{ name, root, quality, bass, slash }] best first, [] if nothing matches.
  function name(pitches) {
    if (!pitches || !pitches.length) return [];
    const uniq = [...new Set(pitches.map(pc))];
    const bass = pc(Math.min(...pitches));

    if (uniq.length === 1) return [{ name: NAMES[uniq[0]], root: uniq[0], quality: 'note', bass, slash: false }];

    const set = new Set(uniq);
    const out = [];
    for (let root = 0; root < 12; root++) {
      for (let tIdx = 0; tIdx < TEMPLATES.length; tIdx++) {
        const [q, ivs] = TEMPLATES[tIdx];
        if (ivs.length !== set.size) continue;
        if (!ivs.every(iv => set.has(pc(root + iv)))) continue;
        const slash = root !== bass;
        out.push({
          name: NAMES[root] + q + (slash ? '/' + NAMES[bass] : ''),
          root, quality: q, bass, slash,
          _rank: (slash ? 100 : 0) + tIdx,     // bass-rooted first, then simpler
        });
      }
    }
    out.sort((a, b) => a._rank - b._rank);
    return out.map(({ _rank, ...r }) => r);
  }

  return { name, NAMES };
})();
