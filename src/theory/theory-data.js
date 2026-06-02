// ── THEORY DATA ───────────────────────────────────────
// Static lookup data. No DOM access, no state mutation.

const THEORY_DATA = {
  modes:              MODES,
  fifths:             FIFTHS,
  relativeMinorByMajor: REL,
  relativeMajorByMinor: MINOR_ROOT_TO_MAJOR,
  degreeCopy:         DD,
};

const degreeCopy  = () => THEORY_DATA.degreeCopy;
const fifthsData  = () => THEORY_DATA.fifths;
const relativeMinor = (major) => THEORY_DATA.relativeMinorByMajor[major] || '';
const relativeMajorFromMinor = (minorRoot) => {
  const key = String(minorRoot || '');
  // Accept both 'A' and 'Am' — MINOR_ROOT_TO_MAJOR keys are 'Am' etc.
  const withM = key.endsWith('m') ? key : key + 'm';
  return MINOR_ROOT_TO_MAJOR[withM] || MINOR_ROOT_TO_MAJOR[key] || null;
};

// ── PRODUCTION DATA ────────────────────────────────────
const PRODUCTION_DATA = {
  house: {
    title:'House', bpm:124, sub:'4/4 — kick on every beat',
    cards:[
      {h:'Scale',   b:'Minor Pentatonic', p:'Keeps the mood dark but groove-friendly.'},
      {h:'Tension', b:'Dominant 7ths',    p:'Add b7 on the V chord for funk colour.'},
      {h:'Tip',     b:'Use inversions',   p:'Move the bass under static harmony.'},
    ],
    elements:[
      {icon:'🥁',name:'Kick',    desc:'4-on-the-floor, tight and punchy',           anim:null},
      {icon:'👏',name:'Clap',   desc:'Snare on 2 and 4, with room verb',           anim:null},
      {icon:'🎩',name:'Hi-hats',desc:'16th note groove, slight swing',             anim:null},
      {icon:'🎹',name:'Stabs',  desc:'Off-beat chord stabs, gate or chop',         anim:'stab'},
      {icon:'🎸',name:'Bass',   desc:'Filtered, sliding into beat 1',              anim:'bass'},
      {icon:'🎵',name:'Synth',  desc:'Pad layer under everything',                 anim:null},
    ],
    progressions:[
      {chords:['Am','G','F','E'], desc:'i – ♭VII – ♭VI – V: classic dark groove'},
      {chords:['Dm','Am','Bb','C'],desc:'i – v – ♭VI – ♭VII: uplifting modal'},
      {chords:['Fm','Eb','Db','Ab'],desc:'Minor with flat-side gravity'},
    ],
    groove:[
      'Lock the kick to the bass line in the first bar.',
      'Use syncopated stabs between beats 2–3.',
      'Layer an 8th-note open hat under the 16th groove.',
      'Keep the main motif under 4 bars so it loops naturally.',
    ],
    pattern:[
      {label:'Kick', cl:'',        p:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},
      {label:'Clap', cl:'clap',    p:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]},
      {label:'Hat',  cl:'hat-c',   p:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
      {label:'Open', cl:'hat-o',   p:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0]},
    ],
  },
  neosoul: {
    title:'Neo Soul', bpm:90, sub:'4/4 — laid back, swing 16ths',
    cards:[
      {h:'Scale',   b:'Dorian + Extensions', p:'min9, maj7, dominant 13ths.'},
      {h:'Rhythm',  b:'Swing 16ths',          p:'Push the snare slightly behind the beat.'},
      {h:'Tip',     b:'Chord substitutions', p:'Replace V with bVII for a hipper sound.'},
    ],
    elements:[
      {icon:'🥁',name:'Kick',   desc:'Slightly loose, 808-influenced',  anim:null},
      {icon:'👏',name:'Snare',  desc:'Fat and roomy, slightly behind',  anim:null},
      {icon:'🎩',name:'Hi-hats',desc:'Loose swing 16ths',               anim:null},
      {icon:'🎹',name:'Rhodes', desc:'Warm chords with vibrato',        anim:'stab'},
      {icon:'🎸',name:'Bass',   desc:'Walking or 16th-note pattern',    anim:'bass'},
      {icon:'🎵',name:'Strings',desc:'Soft counter-melody',             anim:null},
    ],
    progressions:[
      {chords:['Dm9','G13','Cmaj7','Am9'], desc:'ii9 – V13 – Imaj7 – vi9: classic'},
      {chords:['Fmaj7','Em7','Am7','Dm7'], desc:'IV – iii – vi – ii: minor circles'},
      {chords:['Cm9','Fm9','Bb13','Ebmaj7'],desc:'Neo soul in Eb Dorian'},
    ],
    groove:[
      'Play the snare slightly behind beat 2 and 4.',
      'Use chord extensions: maj9, min11, dom13.',
      'Counter-melody on Rhodes or guitar fills the space.',
      'Walk the bass under static harmony for movement.',
    ],
    pattern:[
      {label:'Kick', cl:'',        p:[1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0]},
      {label:'Snare',cl:'clap',    p:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]},
      {label:'Hat',  cl:'hat-c',   p:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]},
      {label:'Shake',cl:'shaker',  p:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1]},
    ],
  },
};
const GENRES = PRODUCTION_DATA;
