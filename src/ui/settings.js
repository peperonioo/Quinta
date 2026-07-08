// ── SETTINGS (V5.39) ──────────────────────────────────
// A gear in the top bar opens this sheet: theme, language and the plasma palette
// (moved out of the top bar / bottom bar into one place).
const Settings = (() => {
  let _open = false;
  const el = () => document.getElementById('settingsSheet');

  function syncActive() {
    const light = document.body.classList.contains('light');
    el()?.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('on', (b.dataset.theme === 'light') === light));
    el()?.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === st.lang));
    el()?.querySelectorAll('[data-rp]').forEach(b => b.classList.toggle('on', (b.dataset.rp === 'real') === (st.realPiano !== false)));
    el()?.querySelectorAll('[data-hap]').forEach(b => b.classList.toggle('on', (b.dataset.hap === 'on') === (st.haptics !== false)));
  }

  function setTheme(tk) {
    const light = document.body.classList.contains('light');
    if ((tk === 'light') !== light && typeof toggleTheme === 'function') toggleTheme();
    syncActive();
  }
  function setLang(l) { if (typeof setLanguage === 'function') setLanguage(l); syncActive(); }

  // Real (sampled) piano vs pure synth. Turning it on kicks the lazy sample load.
  function setRealPiano(v) {
    st.realPiano = !!v; saveState(); syncActive();
    if (st.realPiano && typeof AudioEngine === 'object' && AudioEngine.ctx) {
      if (typeof SamplePiano === 'object') SamplePiano.ensure();
      if (typeof SampleGuitar === 'object') SampleGuitar.ensure();
      if (typeof SampleBass === 'object') SampleBass.ensure();
    }
    if (typeof haptic === 'function') haptic('sel');
  }

  function show()  { const b = el(); if (!b) return; b.hidden = false; requestAnimationFrame(() => b.classList.add('open')); _open = true; syncActive();
                     if (typeof OverlayManager === 'object') OverlayManager.opened('settings');
                     if (typeof FocusTrap === 'object') FocusTrap.activate(b); }
  function close() { const b = el(); if (!b) return; b.classList.remove('open'); _open = false; setTimeout(() => { if (!_open) b.hidden = true; }, 200);
                     if (typeof FocusTrap === 'object') FocusTrap.release(b); }
  function toggle(){ _open ? close() : show(); }

  function setHaptics(v) {
    st.haptics = !!v; saveState(); syncActive();
    if (st.haptics && typeof haptic === 'function') haptic('sel');   // felt confirmation
  }

  return { show, close, toggle, setTheme, setLang, setRealPiano, setHaptics, syncActive, isOpen: () => _open };
})();
