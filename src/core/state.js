// ── STATE ─────────────────────────────────────────────
// Single source of truth. Only mutated through AppActions/ActionDispatcher.

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const saved = JSON.parse(raw);
    return { ...defaultState, ...saved };
  } catch (_) {
    return { ...defaultState };
  }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); } catch (_) {}
}

let st = loadSavedState();

// curDeg is not in st because it is a transient UI state (which degree popup is open)
let curDeg   = -1;
let curGenre = st.genre || 'house';
let isLight  = st.theme === 'light';
let playing  = false, pInterval = null, pStep = 0;

const AppState = {
  get()    { return { ...st }; },
  set(key, value) { st[key] = value; saveState(); },
  snapshot() { return JSON.parse(JSON.stringify(st)); },
};
