// ── ACTIONS ───────────────────────────────────────────
// All UI interactions route through ActionDispatcher.
// RenderEngine and HistoryEngine are referenced by name (defined later, called at runtime).

const ActionDispatcher = {
  dispatch(type, payload = {}) {
    try {
      switch (type) {
        case 'SET_KEY': {
          // payload.key is the clicked SECTOR (a parent-major key). Re-root the
          // tonic per the current Major/Minor base; the mode flavour is kept.
          let sector = payload.key;
          if (!MAJOR_ROOTS.has(sector)) sector = MINOR_ROOT_TO_MAJOR[sector] || wheelKey();
          st.key = tonicForSectorMode(sector, wheelMode());
          st.wheelView = st.tonality;
          curDeg = -1;
          closePopup(false);
          RenderEngine.full();
          if (typeof WheelFX === 'object') WheelFX.select();
          break;
        }
        case 'SET_MODE': {
          // Mode only recolours the degrees / progression — the circle is left
          // exactly where it is (Major/Minor base + tonic unchanged).
          st.mode = payload.mode;
          curDeg = -1;
          closePopup(false);
          RenderEngine.full();
          break;
        }
        case 'SET_WHEEL_VIEW': {
          // The Major/Minor toggle is the fundamental tonality. It sets the base,
          // moves the tonic to the sector's major / relative-minor, and resets the
          // mode to the matching ionian/aeolian (same sector, so no wheel jump).
          const view = payload.view === 'minor' ? 'minor' : 'major';
          const targetMode = view === 'minor' ? 'aeolian' : 'ionian';
          const sector = parentMajor(st.key, wheelMode());
          st.key = tonicForSectorMode(sector, targetMode);
          st.tonality = view; st.mode = targetMode; st.wheelView = view;
          curDeg = -1;
          closePopup(false);
          RenderEngine.full();
          break;
        }
        case 'SELECT_DEGREE': {
          const idx = payload.idx;
          if (idx < 0 || idx > 6) break;
          curDeg = idx;
          if (!payload.fromHistory) HistoryEngine.addDegree(idx, { source: payload.source, sourceEl: payload.sourceEl });
          RenderEngine.partial(['suggestions', 'history', 'trails', 'degrees', 'instruments']);
          break;
        }
        case 'CLEAR_DEGREE':
          curDeg = -1;
          closePopup(false);
          RenderEngine.partial(['degrees', 'suggestions']);
          break;
        case 'SET_MOOD':
          st.mood = payload.mood || 'balanced';
          RenderEngine.partial(['suggestions']);
          break;
        case 'REMOVE_CHORD':
          HistoryEngine.remove(payload.index);
          break;
        case 'CLEAR_PROGRESSION':
          HistoryEngine.clear();
          break;
        case 'SET_LANGUAGE':
          setLanguage(payload.lang);
          break;
        case 'SET_THEME':
          toggleTheme();
          break;
        case 'OPEN_POPOVER':
          showDegreePopup(payload.idx);
          break;
        case 'CLOSE_POPOVER':
          closePopup();
          break;
        default:
          console.warn('[EFC] Unknown action:', type);
      }
      saveState();
      if (window.EFC_DEV && Array.isArray(window.EFC_DEV.errors)) {
        // no-op here; errors array only fills on catch
      }
    } catch (err) {
      console.error('[EFC] Action error:', type, err);
      if (window.EFC_DEV && Array.isArray(window.EFC_DEV.errors)) {
        window.EFC_DEV.errors.push({ type, payload, error: String(err), ts: Date.now() });
      }
    }
  },
};

const AppActions = {
  setKey(k)             { ActionDispatcher.dispatch('SET_KEY',       { key: k }); },
  setMode(mode)         { ActionDispatcher.dispatch('SET_MODE',       { mode }); },
  setWheelView(view)    { ActionDispatcher.dispatch('SET_WHEEL_VIEW', { view }); },
  selectDegree(idx, opts = {}) { ActionDispatcher.dispatch('SELECT_DEGREE', { idx, ...opts }); },
  clearDegree()         { ActionDispatcher.dispatch('CLEAR_DEGREE'); },
  setMood(mood)         { ActionDispatcher.dispatch('SET_MOOD',       { mood }); },
};

// Convenience alias for legacy callers
function setKey(k) { AppActions.setKey(k); }
function render()  { RenderEngine.full(); }
