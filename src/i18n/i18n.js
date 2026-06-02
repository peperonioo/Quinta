// ── I18N ──────────────────────────────────────────────

const I18N = { en: I18N_EN, es: I18N_ES };

function t(key) {
  return I18N[st?.lang || 'en']?.[key] ?? I18N.en[key] ?? key;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val && val !== key) el.textContent = val;
  });
  if (typeof renderModeMenu === 'function') renderModeMenu();
}

function setLanguage(lang) {
  st.lang = I18N[lang] ? lang : 'en';
  saveState();
  applyI18n();
}
