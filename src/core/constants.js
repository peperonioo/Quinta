// ── CONSTANTS ─────────────────────────────────────────
// Pure data. No DOM access. No state mutation.

const APP_VERSION = 'V4.0';
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
const MODE_FRIENDLY = {
  en: {ionian:['Major','bright, stable'],aeolian:['Minor','emotional, natural'],dorian:['Dorian','minor but soulful'],mixolydian:['Mixolydian','major but bluesy'],lydian:['Lydian','floating / dreamy'],phrygian:['Phrygian','dark / Spanish'],locrian:['Locrian','unstable / tense']},
  es: {ionian:['Mayor','brillante, estable'],aeolian:['Menor','emocional, natural'],dorian:['Dórico','menor con lift soul'],mixolydian:['Mixolidio','mayor con color blues'],lydian:['Lidio','flotante / dreamy'],phrygian:['Frigio','oscuro / español'],locrian:['Locrio','inestable / tenso']},
};

const PALETTES = [
  {name:'Cosmos', bg:'#0a0a0b', colors:['#ff7b3b','#ff4500','#b22200']},
  {name:'Aurora', bg:'#080d10', colors:['#00c8b4','#0088ff','#5500ff']},
  {name:'Dusk',   bg:'#0c080f', colors:['#c060ff','#8800ff','#ff0088']},
  {name:'Amber',  bg:'#0c0a06', colors:['#ffcc44','#ff8800','#ff3300']},
];

const defaultState = {
  key:'C', mode:'ionian', theme:'dark', genre:'house',
  palette:0, intensity:1, wheelView:'major', lang:'en',
  history:[], mood:'balanced',
};
