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
// Each genre drives the Production tab AND the connected groove player. Drum
// rows carry `snd` (which synth voice to fire). `chordLane`/`bassLane` say on
// which 16th steps the progression's chord stabs and 808 sub-bass play.
const PRODUCTION_DATA = {
  house: {
    title:'House', bpm:124, sub:'4/4 · kick on every beat · 120–128 BPM',
    cards:[
      {h:'Feel',    b:'Four-on-the-floor', p:'Kick on every beat; the swing lives in the off-beat hats and bass.'},
      {h:'Harmony', b:'7th & 9th chords',  p:'Jazzy, sampled-soul stabs. Add a ♭7 on the V for funk colour.'},
      {h:'Glue',    b:'Sidechain pump',    p:'Duck the bass & pads to the kick — the signature “breathing” groove.'},
    ],
    elements:[
      {icon:'🥁',name:'Kick',    desc:'Tight, punchy four-on-the-floor; tuned low, short tail.', gear:'Roland TR-909', anim:null},
      {icon:'👏',name:'Clap',   desc:'Backbeat on 2 & 4, layered with a short room reverb.',     gear:'TR-909 / TR-808', anim:null},
      {icon:'🎩',name:'Hats',   desc:'Closed 16ths for drive; the open hat on every off-beat (the “tss”).', gear:'TR-909', anim:null},
      {icon:'🎹',name:'Organ stabs', desc:'Off-beat chord stabs — bright, gated, syncopated.',   gear:'Korg M1 “Organ 2”', anim:'stab'},
      {icon:'🎸',name:'Bass',   desc:'Round sub or plucky synth, off-beat bounce, sidechained to the kick.', gear:'TB-303 / Juno / 808 sub', anim:'bass'},
      {icon:'🎛️',name:'Pad',   desc:'Warm analog pad washing under the groove; filter-swept.',   gear:'Roland Juno-106', anim:null},
    ],
    progressions:[
      {chords:['Am','G','F','E'], desc:'i – ♭VII – ♭VI – V: classic dark groove'},
      {chords:['Dm','Am','Bb','C'],desc:'i – v – ♭VI – ♭VII: uplifting modal'},
      {chords:['Fm','Eb','Db','Ab'],desc:'Minor with flat-side gravity'},
    ],
    groove:[
      'Lock the bass to the kick, then move it to the off-beats so they interlock.',
      'Open hat on every “and” (the off-beat) is the house signature.',
      'Sidechain bass + pads to the kick for the pumping feel.',
      'Keep the main loop ≤ 4 bars so it cycles naturally.',
    ],
    tips:[
      {h:'Arrangement', items:[
        'Build in 8/16/32-bar phrases — DJ-friendly intros and outros of pure drums.',
        'Breakdown: strip to pads + filtered chords, then drop the full kick + bass back in.',
        'Automate a low-pass filter sweep across 8 bars to lift into each section.',
      ]},
      {h:'Fills & transitions', items:[
        'Drop the kick for the last bar before a section change — let the off-beats breathe.',
        'A snare/clap roll (16ths → 32nds) builds tension into the drop.',
        'Crash on beat 1 of a new section; reverse-cymbal riser in the bar before.',
      ]},
      {h:'Sound design', items:[
        'Tune the kick to the track’s root note so it sits with the bass.',
        'High-pass the pads so the low end stays clean for kick + sub.',
        'A touch of saturation on the bass adds harmonics that read on small speakers.',
      ]},
    ],
    chordStyle:'stab',
    chordLane:[0,0,0,1, 0,0,1,0, 0,0,0,1, 0,0,1,0],
    bassLane: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    pattern:[
      {label:'Kick', cl:'',        snd:'kick', p:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},
      {label:'Clap', cl:'clap',    snd:'clap', p:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]},
      {label:'Hat',  cl:'hat-c',   snd:'hat',  p:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
      {label:'Open', cl:'hat-o',   snd:'open', p:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]},
    ],
  },
  neosoul: {
    title:'Neo Soul', bpm:90, sub:'4/4 · laid-back, swung 16ths · 70–95 BPM',
    cards:[
      {h:'Feel',    b:'Behind the beat',  p:'Humanised, off-grid (Dilla-style). Snare drags slightly late.'},
      {h:'Harmony', b:'Extended chords',  p:'maj9, min11, dom13 with chromatic passing chords.'},
      {h:'Voice',   b:'Rhodes is king',   p:'Warm electric piano with chorus/vibrato carries the song.'},
    ],
    elements:[
      {icon:'🥁',name:'Kick',   desc:'Loose, slightly soft; 808-tinged low end, never quantised hard.', gear:'MPC / TR-808 hybrid', anim:null},
      {icon:'👏',name:'Snare',  desc:'Fat, roomy, dragged a hair behind the beat; ghost notes between.', gear:'Sampled vinyl / MPC', anim:null},
      {icon:'🎩',name:'Hats',   desc:'Loose swung 16ths, velocity-varied for a human shuffle.',         gear:'MPC swing 54–62%', anim:null},
      {icon:'🎹',name:'Rhodes', desc:'Warm extended chords with chorus + vibrato; the signature sound.', gear:'Fender Rhodes Mk I', anim:'stab'},
      {icon:'🎸',name:'Bass',   desc:'Fingered electric — syncopated 16ths, slides and ghosting.',       gear:'Fender P/J Bass', anim:'bass'},
      {icon:'🎻',name:'Strings',desc:'Soft pad / counter-melody filling the spaces between phrases.',    gear:'Wurlitzer / string ens.', anim:null},
    ],
    progressions:[
      {chords:['Dm9','G13','Cmaj7','Am9'], desc:'ii9 – V13 – Imaj7 – vi9: classic'},
      {chords:['Fmaj7','Em7','Am7','Dm7'], desc:'IV – iii – vi – ii: minor circles'},
      {chords:['Cm9','Fm9','Bb13','Ebmaj7'],desc:'Neo soul in Eb Dorian'},
    ],
    groove:[
      'Drag the snare a few ms behind beats 2 and 4 for the lazy feel.',
      'Add ghost snares and hat shuffles between the main hits.',
      'Voice chords with extensions (maj9, min11, dom13); keep the top voice smooth.',
      'Walk or syncopate the bass under static harmony for movement.',
    ],
    tips:[
      {h:'Arrangement', items:[
        'Leave space — neo-soul breathes; not every bar needs every instrument.',
        'Verse: Rhodes + bass + light drums. Chorus: add strings/keys and lift the dynamics.',
        'Use a 2-bar turnaround (e.g. ii–V) to loop sections smoothly.',
      ]},
      {h:'Fills & embellishment', items:[
        'Rhodes runs and chromatic passing chords fill the gaps between vocal phrases.',
        'Ghost-note snare rolls and hat triplets are the “fills” — keep them soft.',
        'Bass slides and dead notes add the human, finger-played feel.',
      ]},
      {h:'Sound design', items:[
        'Chorus + a touch of tape saturation on the Rhodes for warmth.',
        'Roomy, slightly compressed drums; sample noise/vinyl crackle for texture.',
        'Keep the low end mono and the bass rounded (roll off the highs).',
      ]},
    ],
    chordStyle:'pad',
    chordLane:[1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    bassLane: [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,1,0],
    pattern:[
      {label:'Kick', cl:'',        snd:'kick',  p:[1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0]},
      {label:'Snare',cl:'clap',    snd:'snare', p:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1]},
      {label:'Hat',  cl:'hat-c',   snd:'hat',   p:[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1]},
      {label:'Shake',cl:'shaker',  snd:'shaker',p:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1]},
    ],
  },
};
const GENRES = PRODUCTION_DATA;
