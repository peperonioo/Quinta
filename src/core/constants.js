// ── CONSTANTS ─────────────────────────────────────────
// Pure data. No DOM access. No state mutation.

const APP_VERSION = 'V5.77';
// NOTE: storage key kept as-is across the "Quinta" rebrand so existing saved
// state/progressions are not wiped. It's an internal key, never shown to users.
const STORAGE_KEY = 'easy-fifth-circle:v1';

const NOTES  = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FIFTHS = ['C','G','D','A','E','B','F#','C#','Ab','Eb','Bb','F'];
const ACC    = ['0','1♯','2♯','3♯','4♯','5♯','6♯','7♯','4♭','3♭','2♭','1♭'];

// Enharmonic display: show flats where conventional
const FM  = {A:'A','A#':'Bb',B:'B',C:'C','C#':'Db',D:'D','D#':'Eb',E:'E',F:'F','F#':'Gb',G:'G','G#':'Ab'};
const ENH = {Ab:8,Bb:10,Db:1,Eb:3,Gb:6};
const REL = {C:'Am',G:'Em',D:'Bm',A:'F#m',E:'C#m',B:'G#m','F#':'D#m','C#':'A#m',Ab:'Fm',Eb:'Cm',Bb:'Gm',F:'Dm'};

const MODES = [
  {id:'ionian',    name:'Major',      intervals:[0,2,4,5,7,9,11], degrees:['I','II','III','IV','V','VI','VII'],   qualities:['Maj','Min','Min','Maj','Maj','Min','Dim']},
  {id:'aeolian',   name:'Natural Minor',intervals:[0,2,3,5,7,8,10], degrees:['i','ii°','♭III','iv','v','♭VI','♭VII'], qualities:['Min','Dim','Maj','Min','Min','Maj','Maj']},
  {id:'dorian',    name:'Dorian',     intervals:[0,2,3,5,7,9,10], degrees:['i','ii','♭III','IV','v','vi°','♭VII'], qualities:['Min','Min','Maj','Maj','Min','Dim','Maj']},
  {id:'mixolydian',name:'Mixolydian', intervals:[0,2,4,5,7,9,10], degrees:['I','II','iii°','IV','v','vi','♭VII'], qualities:['Maj','Min','Dim','Maj','Min','Min','Maj']},
  {id:'lydian',    name:'Lydian',     intervals:[0,2,4,6,7,9,11], degrees:['I','II','iii°','#IV°','V','vi','vii'], qualities:['Maj','Maj','Min','Dim','Maj','Min','Min']},
  {id:'phrygian',  name:'Phrygian',   intervals:[0,1,3,5,7,8,10], degrees:['i','♭II','♭III','iv','v°','♭VI','♭VII'], qualities:['Min','Maj','Maj','Min','Dim','Maj','Min']},
  {id:'locrian',   name:'Locrian',    intervals:[0,1,3,5,6,8,10], degrees:['i°','♭II','♭iii','iv','♭V','♭VI','♭vii'], qualities:['Dim','Maj','Min','Min','Maj','Maj','Min']},
];

// Scale degree copy (used for popup descriptions)
const DD = [
  {role:'Tonic',     feel:'Home base. Stable, grounded. Everything resolves here.',    pairs:['IV','V','vi']},
  {role:'Supertonic',feel:'Gentle tension. Pre-dominant energy.',                       pairs:['V','vi','IV']},
  {role:'Mediant',   feel:'Colour chord. Bridges tonic and subdominant areas.',         pairs:['IV','vi','I']},
  {role:'Subdominant',feel:'Warm lift. Opens the phrase without creating hard tension.',pairs:['V','I','ii']},
  {role:'Dominant',  feel:'Maximum pull toward home. Tension engine.',                  pairs:['I','vi','iii']},
  {role:'Submediant',feel:'Emotional depth. Relative minor area.',                      pairs:['IV','ii','I']},
  {role:'Leading tone',feel:'Unstable edge. Maximum tension before resolution.',        pairs:['I','V','iv']},
];

const MINOR_ROOT_TO_MAJOR = {Am:'C',Em:'G',Bm:'D','F#m':'A','C#m':'E','G#m':'B','D#m':'F#','A#m':'C#',Fm:'Ab',Cm:'Eb',Gm:'Bb',Dm:'F'};
const MAJOR_ROOTS = new Set(FIFTHS);
const MINOR_ROOTS = new Set(Object.keys(MINOR_ROOT_TO_MAJOR));

const MODE_ORDER   = ['ionian','aeolian','dorian','mixolydian','lydian','phrygian','locrian'];

// ── Unified key/mode model (V4.3) ─────────────────────
// A "sector" on the circle = a parent-major key signature. Every mode lives in
// some sector; its tonic is one of the 7 notes of that sector's major scale.
// These tables let us derive the sector from a (tonic, mode) pair and vice
// versa, so the wheel, centre, scale, accidentals and degrees share one source
// of truth and can never disagree.
const MODE_FIFTHS_OFF = { ionian:0, lydian:1, mixolydian:-1, dorian:-2, aeolian:-3, phrygian:-4, locrian:-5 };
const MODE_SECTOR_DEG = { ionian:0, dorian:1, phrygian:2, lydian:3, mixolydian:4, aeolian:5, locrian:6 };
const MINOR_MODES     = new Set(['aeolian','dorian','phrygian','locrian']);
const FLAT_KEYS       = new Set(['F','Bb','Eb','Ab','Db','Gb','Cb']);
const IONIAN_STEPS    = [0,2,4,5,7,9,11];

const MODE_FRIENDLY = {
  en: {ionian:['Major','bright, stable'],aeolian:['Minor','emotional, natural'],dorian:['Dorian','minor but soulful'],mixolydian:['Mixolydian','major but bluesy'],lydian:['Lydian','floating / dreamy'],phrygian:['Phrygian','dark / Spanish'],locrian:['Locrian','unstable / tense']},
  es: {ionian:['Mayor','brillante, estable'],aeolian:['Menor','emocional, natural'],dorian:['Dórico','menor con lift soul'],mixolydian:['Mixolidio','mayor con color blues'],lydian:['Lidio','flotante / dreamy'],phrygian:['Frigio','oscuro / español'],locrian:['Locrio','inestable / tenso']},
};

const PALETTES = [
  // `colors[0]` is the UI accent. `flow` = 5 stops the domain-warped plasma ramps
  // through (dark → … → bright) for rich, varied colour across the whole screen.
  {name:'Quinta', bg:'#0b0810', colors:['#ff5a3c','#c4287a','#ffb24a'],          // signature
    flow:['#241141','#9c1e6e','#ff5a3c','#ffb24a','#1fb6a8']},                   // plum→magenta→coral→amber→teal
  {name:'Cosmos', bg:'#0a0a0b', colors:['#ff8a3d','#ff2e63','#7b2ff7'],
    flow:['#1e1140','#7b2ff7','#ff2e63','#ff8a3d','#3ad0ff']},
  {name:'Aurora', bg:'#080d10', colors:['#00e0b8','#2a7bff','#9b3cff'],
    flow:['#05202a','#1fa6ff','#9b3cff','#ff5fa2','#00e0b8']},
  {name:'Dusk',   bg:'#0c080f', colors:['#ff5fa2','#a64bff','#ffb347'],
    flow:['#180b24','#a64bff','#ff5fa2','#ffb347','#46e0c0']},
  {name:'Sunset', bg:'#0d0608', colors:['#ffd24a','#ff7a1a','#ffe08a'],   // swatch is yellow (golden palette)
    flow:['#2a0a18','#a01e5a','#ff4d4d','#ff9e3d','#ffe08a']},      // wine→magenta→red→orange→gold
  {name:'Ocean',  bg:'#060c12', colors:['#2a9bd6','#1fd6c0','#9b6bff'],
    flow:['#06182e','#13427a','#1f8fd6','#3fd0e0','#bfeeff']},      // deep blue→teal→cyan→pale
  {name:'Mint',   bg:'#06120f', colors:['#19c39a','#3fd0e0','#a6f24a'],
    flow:['#0a2230','#0e9488','#21d3a6','#8be0a0','#e6fff0']},      // teal→emerald→mint→pale
  {name:'Berry',  bg:'#0e0612', colors:['#c84bb0','#ff5a9e','#7b2ff7'],
    flow:['#1a0726','#5e1a7a','#b02ea0','#ff5a9e','#ffc0dd']},      // plum→purple→magenta→pink
];

const defaultState = {
  key:'C', mode:'ionian', tonality:'major', theme:'dark', genre:'house',
  palette:0, intensity:1, wheelView:'major', lang:'en',
  history:[], mood:'balanced', bpm:100,
  sevenths:false, countIn:false, voicingOpen:false, metroSound:'woodblock',
  pianoSound:'piano', loop:false,
  activeSection:'A', chain:false,        // A/B parts; `chain` plays A→B as one song
  snap:0.25,                             // grid snap in beats (0.25 = 1/16 note; 0 = free)
  onboarded:false,
};
