// ── ACTIONS ───────────────────────────────────────────
// All UI interactions route through ActionDispatcher.
// RenderEngine and HistoryEngine are referenced by name (defined later, called at runtime).

const ActionDispatcher = {
  dispatch(type, payload = {}) {
    try {
      switch (type) {
        case 'SET_KEY':
          st.key = payload.key;
          normalizeKeyState();
          curDeg = -1;
          closePopup(false);
          RenderEngine.full();
          if (typeof WheelFX === 'object') WheelFX.select();
          if (typeof WheelGravity === 'object') WheelGravity.clear();
          break;
        case 'SET_MODE':
          st.mode = payload.mode;
          curDeg = -1;
          closePopup(false);
          RenderEngine.full();
          if (typeof WheelGravity === 'object') WheelGravity.clear();
          break;
        case 'SET_WHEEL_VIEW':
          st.wheelView = payload.view === 'minor' ? 'minor' : 'major';
          curDeg = -1;
          normalizeKeyState();
          closePopup(false);
          RenderEngine.full();
          if (typeof WheelGravity === 'object') WheelGravity.clear();
          break;
        case 'SELECT_DEGREE': {
          const idx = payload.idx;
          if (idx < 0 || idx > 6) break;
          curDeg = idx;
          if (!payload.fromHistory) HistoryEngine.addDegree(idx, { source: payload.source, sourceEl: payload.sourceEl });
          RenderEngine.partial(['suggestions', 'history', 'trails']);
          if (typeof WheelGravity === 'object') WheelGravity.show(curDeg);
          break;
        }
        case 'CLEAR_DEGREE':
          curDeg = -1;
          closePopup(false);
          RenderEngine.partial(['degrees', 'suggestions']);
          if (typeof WheelGravity === 'object') WheelGravity.clear();
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
