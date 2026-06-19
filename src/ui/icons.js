// ── ICONS (Claude Design line set · v1.0) ─────────────
// One family: 24×24 grid, 1.6px stroke, round caps/joins, currentColor.
// Replaces every emoji. `f:1` = solid-fill icon, otherwise stroked.
const ICONS = {
  library:   { p: '<path d="M5 4h4v16H5zM11 4h4v16h-4z"/><path d="M17.4 4.6l3.2.8-3.4 15.4-3.2-.8z"/>' },
  share:     { p: '<circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="18" cy="18" r="2.3"/><path d="M8 10.9l8-3.8M8 13.1l8 3.8"/>' },
  download:  { p: '<path d="M12 4v10"/><path d="M8 10.5l4 4 4-4"/><path d="M5 19h14"/>' },
  play:      { p: '<path d="M8 5.2c0-.6.65-1 1.18-.68l9.1 6.3a.8.8 0 0 1 0 1.36l-9.1 6.3A.8.8 0 0 1 8 17.8z"/>', f: 1 },
  stop:      { p: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>', f: 1 },
  countin:   { p: '<path d="M9 4h6l3 16H6z"/><path d="M12 8l4 7"/><path d="M7 16h10"/>' },
  voicing:   { p: '<path d="M12 3l8.5 4.2L12 11.4 3.5 7.2z"/><path d="M3.5 12L12 16.2 20.5 12"/><path d="M3.5 16.8L12 21l8.5-4.2"/>' },
  sun:       { p: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>' },
  moon:      { p: '<path d="M20.5 13.5A8 8 0 0 1 10.5 3.5a6.6 6.6 0 1 0 10 10z"/>' },
  mode:      { p: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>' },
  shapes:    { p: '<path d="M12 3l9 9-9 9-9-9z"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>' },
  piano:     { p: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v8M15 5v8"/><rect x="7.3" y="5" width="2.2" height="6.5" rx=".6" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="2.2" height="6.5" rx=".6" fill="currentColor" stroke="none"/>' },
  guitar:    { p: '<circle cx="8.5" cy="15.5" r="5"/><circle cx="8.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/><path d="M12 12l6.2-6.2"/><path d="M16.5 3.6l3.9 3.9-1.8 1.8-3.9-3.9z"/>' },
  help:      { p: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 1 1 3.6 2.7c-.7.25-1.3.8-1.3 1.6v.4"/><circle cx="11.5" cy="17" r="1" fill="currentColor" stroke="none"/>' },
  chevron:   { p: '<path d="M6 9l6 6 6-6"/>' },
  chevronR:  { p: '<path d="M9 6l6 6-6 6"/>' },
  close:     { p: '<path d="M6 6l12 12M18 6L6 18"/>' },
  arrowL:    { p: '<path d="M19 12H5M11 6l-6 6 6 6"/>' },
  arrowR:    { p: '<path d="M5 12h14M13 6l6 6-6 6"/>' },
  plus:      { p: '<path d="M12 5v14M5 12h14"/>' },
  check:     { p: '<path d="M5 12.5l4.5 4.5L19 6.5"/>' },
};

// Build an inline SVG string for an icon (default 18px).
function icon(name, size) {
  const ic = ICONS[name]; if (!ic) return '';
  const s = size || 18;
  const open = ic.f
    ? `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">`
    : `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`;
  return open + ic.p + '</svg>';
}

// Inject icons into any element carrying data-ico (idempotent). The element's
// text label (if any) stays; the glyph is prepended once.
function applyIcons(root) {
  (root || document).querySelectorAll('[data-ico]').forEach(el => {
    const want = el.dataset.ico;
    let svg = el.querySelector(':scope > svg.ico');
    if (svg && svg.dataset.name === want) return;     // already correct
    if (svg) svg.remove();
    el.insertAdjacentHTML('afterbegin', icon(want, +el.dataset.icoSize || 18));
    svg = el.querySelector(':scope > svg.ico'); if (svg) svg.dataset.name = want;
  });
}

// Swap an element's icon to a different glyph (for play↔stop, sun↔moon).
function setIcon(el, name) {
  if (!el) return;
  el.dataset.ico = name;
  const old = el.querySelector(':scope > svg.ico'); if (old) old.remove();
  el.insertAdjacentHTML('afterbegin', icon(name, +el.dataset.icoSize || 18));
  const svg = el.querySelector(':scope > svg.ico'); if (svg) svg.dataset.name = name;
}
