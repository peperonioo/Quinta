// ── MODULATION COACH (V5.34) ──────────────────────────
// Suggests musically-sound key changes from the current key. Each target carries
// a one-line "why" and a pivot chord (shared by both keys) to move through; tap
// one and the wheel jumps there. A small "Modulate" button opens the panel.
const ModulationCoach = (() => {
  const PCF = {}; FIFTHS.forEach(k => { PCF[ni(k)] = k; });   // pitch-class → conventional spelling
  const STEPS_MAJ = [0,2,4,5,7,9,11], QUAL_MAJ = ['','m','m','','','m','°'];
  const STEPS_MIN = [0,2,3,5,7,8,10], QUAL_MIN = ['m','°','','m','m','',''];   // natural minor

  function triads(tonicPc, maj) {
    const S = maj ? STEPS_MAJ : STEPS_MIN, Q = maj ? QUAL_MAJ : QUAL_MIN;
    return S.map((s, i) => ({ pc: (tonicPc + s) % 12, q: Q[i] }));
  }
  const cName = c => dn(na(c.pc)) + c.q;

  // A shared diatonic chord to pivot through (prefer one that isn't the home tonic).
  function pivot(curPc, curMaj, tgtPc, tgtMaj) {
    const A = triads(curPc, curMaj), B = triads(tgtPc, tgtMaj);
    const shared = A.filter(a => B.some(b => b.pc === a.pc && b.q === a.q));
    if (!shared.length) return null;
    return cName(shared.find(s => s.pc !== curPc) || shared[0]);
  }

  const L = o => o[st.lang] || o.en;
  const keyName = (pc, maj) => `${dn(na(pc))} ${st.lang === 'es' ? (maj ? 'mayor' : 'menor') : (maj ? 'major' : 'minor')}`;
  // Map a (tonic, quality) key onto a wheel (sector, view).
  const place = (pc, maj) => maj ? { sector: PCF[pc], view: 'major' } : { sector: PCF[(pc + 3) % 12], view: 'minor' };

  function targets() {
    // Authoritative current tonic + quality — works for major, minor and modes,
    // independent of how the wheel stores its key/view internally.
    const homeName = (typeof gr === 'function' && gr()[0]) ? gr()[0] : st.key;
    const homePc   = ni(homeName);
    const homeMaj  = (typeof modeIsMinor === 'function') ? !modeIsMinor(st.mode) : (st.wheelView !== 'minor');
    const up = n => (homePc + n) % 12;

    const defs = [
      homeMaj
        ? [up(9), false, {en:'Relative minor', es:'Relativa menor'}, {en:'Same notes — just darker.',          es:'Mismas notas — solo que más oscuro.'}]
        : [up(3), true,  {en:'Relative major', es:'Relativa mayor'}, {en:'Same notes — brighter and open.',     es:'Mismas notas — más luminoso y abierto.'}],
      [up(7), true,      {en:'Dominant',        es:'Dominante'},     {en:'Up a fifth — lifts the energy.',      es:'Una quinta arriba — sube la energía.'}],
      [up(5), true,      {en:'Subdominant',     es:'Subdominante'},  {en:'Down a fifth — warmer, relaxed.',     es:'Una quinta abajo — más cálido y relajado.'}],
      [homePc, !homeMaj, {en:'Parallel',        es:'Paralela'},     {en:'Same home note — flips the mood.',    es:'Mismo centro — voltea el mood.'}],
      [up(2), true,      {en:'Up a whole step', es:'Un tono arriba'},{en:'The classic final-chorus lift.',      es:'El subidón clásico de estribillo.'}],
    ];
    return defs.map(([pc, maj, label, why]) => ({
      label: L(label), why: L(why), name: keyName(pc, maj),
      pivot: pivot(homePc, homeMaj, pc, maj), ...place(pc, maj),
    }));
  }

  let _open = false;
  const el = () => document.getElementById('modulatePanel');

  function render() {
    const box = el(); if (!box) return;
    const es = st.lang === 'es';
    box.innerHTML = `
      <div class="mod-head">
        <span class="mod-title">${es ? '¿Hacia dónde modular?' : 'Where to modulate?'}</span>
        <button class="mod-x" onclick="ModulationCoach.close()" aria-label="Close">✕</button>
      </div>
      <div class="mod-list">
        ${targets().map(tg => `
          <button class="mod-item" onclick="ModulationCoach.jump('${tg.sector}','${tg.view}')">
            <span class="mod-role">${tg.label}</span>
            <span class="mod-key">${tg.name}</span>
            <span class="mod-why">${tg.why}</span>
            ${tg.pivot ? `<span class="mod-pivot">${es ? 'pivote' : 'pivot'} · <b>${tg.pivot}</b></span>` : ''}
          </button>`).join('')}
      </div>`;
  }

  function show() {
    const box = el(); if (!box) return;
    render(); box.hidden = false; requestAnimationFrame(() => box.classList.add('open'));
    _open = true;
    document.querySelectorAll('.modulate-btn').forEach(b => b.classList.add('on'));
    if (typeof OverlayManager === 'object') OverlayManager.opened('modulate');
  }
  function close() {
    const box = el(); if (!box) return;
    box.classList.remove('open'); _open = false;
    document.querySelectorAll('.modulate-btn').forEach(b => b.classList.remove('on'));
    setTimeout(() => { if (!_open) box.hidden = true; }, 200);
  }
  function toggle() { _open ? close() : show(); }

  function jump(sector, view) {
    if (typeof wheelLocked !== 'undefined' && wheelLocked && typeof setWheelLock === 'function') setWheelLock(false);
    AppActions.setKey(sector);
    AppActions.setWheelView(view);
    if (typeof tel === 'function') tel('modulate');
    close();
  }

  return { toggle, show, close, jump, isOpen: () => _open };
})();
