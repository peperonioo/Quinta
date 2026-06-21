// ── MODE SELECTOR ─────────────────────────────────────
// Custom mode dropdown portaled to document.body.

function renderModeMenu() {
  const menu   = document.getElementById('modeMenu');
  const main   = document.getElementById('modeMain');
  const sub    = document.getElementById('modeSub');
  const select = document.getElementById('modeSelect');
  if (!menu || !main || !sub) return;
  const current = modeFriendly(st.mode);
  main.textContent = current[0];
  sub.textContent  = current[1];
  const sm = document.getElementById('setModeMain'); if (sm) sm.textContent = current[0];
  const ss = document.getElementById('setModeSub');  if (ss) ss.textContent  = current[1];
  menu.innerHTML = MODE_ORDER.map(id => {
    const [name, desc] = modeFriendly(id);
    const m = MODES.find(x => x.id === id);
    return `<button class="mode-option ${id === st.mode ? 'active' : ''}" onclick="ModeMenu.choose('${id}')">
      <span><b>${name}</b><small>${desc}</small></span>
      <em>${m?.degrees?.[0] || ''}</em>
    </button>`;
  }).join('');
  if (select) select.value = st.mode;
}

function _placeModeMenu() {
  // On mobile the sidebar is hidden; fall back to the FAB's mode button.
  const d1 = document.getElementById('modeDisplay');
  const display = (d1 && d1.getBoundingClientRect().width > 0)
    ? d1 : (document.getElementById('setModeBtn') || d1);
  const menu    = document.getElementById('modeMenu');
  if (!display || !menu) return;
  if (menu.parentElement !== document.body) document.body.appendChild(menu);
  const pad = 14;
  const r   = display.getBoundingClientRect();
  const vw  = window.innerWidth, vh = window.innerHeight;
  const width  = Math.min(Math.max(r.width, 320), vw - pad * 2);
  const maxH   = Math.min(360, vh - pad * 2);
  const left   = Math.min(Math.max(r.left, pad), vw - width - pad);
  let   top    = r.bottom + 10;
  menu.style.position  = 'fixed';
  menu.style.left      = left + 'px';
  menu.style.right     = 'auto';
  menu.style.width     = width + 'px';
  menu.style.maxHeight = maxH + 'px';
  menu.style.bottom    = 'auto';
  menu.style.zIndex    = 'var(--z-dropdown, 9000)';
  const wasOpen = menu.classList.contains('portal-open');
  if (!wasOpen) { menu.style.visibility = 'hidden'; menu.classList.add('portal-open'); }
  const h = Math.min(menu.scrollHeight || 280, maxH);
  if (!wasOpen) { menu.classList.remove('portal-open'); menu.style.visibility = ''; }
  if (top + h > vh - pad) top = Math.max(pad, r.top - h - 10);
  menu.style.top = top + 'px';
}

function _closeModeMenu() {
  document.getElementById('modeControl')?.classList.remove('open');
  document.getElementById('modeMenu')?.classList.remove('portal-open');
}

const ModeMenu = {
  toggle(ev) {
    ev?.stopPropagation?.();
    const control = document.getElementById('modeControl');
    const menu    = document.getElementById('modeMenu');
    if (!control || !menu) return;
    const open = !menu.classList.contains('portal-open');
    if (!open) { _closeModeMenu(); return; }
    OverlayManager.opened('mode-menu');
    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    renderModeMenu();
    control.classList.add('open');
    menu.classList.add('portal-open');
    _placeModeMenu();
  },
  close:   _closeModeMenu,
  choose(id) {
    AppActions.setMode(id);
    _closeModeMenu();
  },
};

// Click-outside + Escape are handled centrally by OverlayManager (registered as
// 'mode-menu' in popover-manager.js). Only reposition on resize/scroll here.
window.addEventListener('resize', () => {
  if (document.getElementById('modeMenu')?.classList.contains('portal-open')) _placeModeMenu();
}, { passive: true });
window.addEventListener('scroll', () => {
  if (document.getElementById('modeMenu')?.classList.contains('portal-open')) _placeModeMenu();
}, true);
