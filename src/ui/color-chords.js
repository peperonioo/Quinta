// ── COLOUR & MODULATION — Beyond the Key (V5.45) ────────
// Unified "beyond the key" panel in two levels:
//
//  BORROW — non-diatonic chords from parallel modes.
//           Add one to your progression, then return home.
//
//  MODULATE — change key permanently using a pivot chord
//             (a chord shared by both keys — the bridge).
//
// The pivot chord IS the borrowed chord taken one step further.
// One panel, two levels of harmonic adventure.

const ColorChords = (() => {
  // ── Colour chord data ──────────────────────────────
  const DOM7 = [0,4,7,10], MAJ = [0,4,7], MIN = [0,3,7];
  const L  = o => o[st.lang] || o.en;
  const nm = pc => dn(na(((pc % 12) + 12) % 12));

  function colorChords() {
    const row = (typeof gc === 'function') ? gc() : [];
    const T   = row[0] ? ni(row[0].note) : ni(st.key || 'C');
    const maj = (typeof modeIsMinor === 'function') ? !modeIsMinor(st.mode) : (st.wheelView !== 'minor');
    const up  = n => (T + n) % 12;
    const dom7  = (pc, role, why) => ({ pc, iv:DOM7, name:nm(pc)+'7',  quality:'Maj', variant:'7',   role, why });
    const major = (pc, role, why) => ({ pc, iv:MAJ,  name:nm(pc),      quality:'Maj', variant:null,  role, why });
    const minor = (pc, role, why) => ({ pc, iv:MIN,  name:nm(pc)+'m',  quality:'Min', variant:null,  role, why });

    return maj ? [
      dom7 (up(2),  {en:'V7/V',       es:'V7/V'      }, {en:'Tension pulling hard to V.',          es:'Tensión que tira fuerte hacia el V.'}),
      dom7 (up(4),  {en:'V7/vi',      es:'V7/vi'     }, {en:'Leads to the relative minor.',         es:'Lleva a la relativa menor.'}),
      minor(up(5),  {en:'iv',         es:'iv'        }, {en:'Borrowed minor — bittersweet, → I.',   es:'Menor prestado — agridulce, → I.'}),
      major(up(10), {en:'♭VII',       es:'♭VII'      }, {en:'Rock / Mixolydian colour, → I.',       es:'Color rock/mixolidio, → I.'}),
      major(up(8),  {en:'♭VI',        es:'♭VI'       }, {en:'Cinematic lift, → I or V.',            es:'Subida cinematográfica, → I o V.'}),
    ] : [
      dom7 (up(7),  {en:'V7',         es:'V7'        }, {en:'Strong pull home (harmonic minor).',   es:'Tirón fuerte a casa (menor armónica).'}),
      major(up(1),  {en:'♭II',        es:'♭II'       }, {en:'Neapolitan — dark, dramatic, → V.',    es:'Napolitana — oscura y dramática, → V.'}),
      major(up(5),  {en:'IV',         es:'IV'        }, {en:'Dorian brightening.',                  es:'Brillo dórico.'}),
      dom7 (up(2),  {en:'V7/V',       es:'V7/V'      }, {en:'Pulls toward the dominant.',           es:'Tira hacia el dominante.'}),
      major(up(0),  {en:'I (Picardy)',es:'I (Picardía)'},{en:'A hopeful major ending.',             es:'Un final mayor esperanzado.'}),
    ];
  }

  // ── Modulation data ────────────────────────────────
  const PCF = {}; FIFTHS.forEach(k => { PCF[ni(k)] = k; });
  const _SMAJ = [0,2,4,5,7,9,11], _QMAJ = ['','m','m','','','m','°'];
  const _SMIN = [0,2,3,5,7,8,10], _QMIN = ['m','°','','m','m','',''];

  function _triads(pc, maj) {
    const S = maj ? _SMAJ : _SMIN, Q = maj ? _QMAJ : _QMIN;
    return S.map((s, i) => ({ pc:(pc+s)%12, q:Q[i] }));
  }
  const _cn    = c  => dn(na(c.pc)) + c.q;
  const _kname = (pc, maj) => `${dn(na(pc))} ${st.lang==='es' ? (maj?'mayor':'menor') : (maj?'major':'minor')}`;
  const _place = (pc, maj) => maj ? {sector:PCF[pc],view:'major'} : {sector:PCF[(pc+3)%12],view:'minor'};

  function _pivot(curPc, curMaj, tgtPc, tgtMaj) {
    const shared = _triads(curPc,curMaj).filter(a => _triads(tgtPc,tgtMaj).some(b => b.pc===a.pc && b.q===a.q));
    if (!shared.length) return null;
    const c = shared.find(s => s.pc !== curPc) || shared[0];
    return { pc:c.pc, q:c.q, name:_cn(c) };       // the bridge chord, addable to the progression
  }

  function modTargets() {
    const row    = (typeof gc === 'function') ? gc() : [];
    const homePc = row[0] ? ni(row[0].note) : ni(st.key || 'C');
    const homeMaj= (typeof modeIsMinor === 'function') ? !modeIsMinor(st.mode) : (st.wheelView !== 'minor');
    const up = n => (homePc + n) % 12;

    const defs = [
      homeMaj
        ? [up(9), false, {en:'Relative minor',es:'Relativa menor'}, {en:'Same notes — darker and inward.',   es:'Mismas notas — más oscuro e interior.'}]
        : [up(3), true,  {en:'Relative major',es:'Relativa mayor'}, {en:'Same notes — brighter and open.',   es:'Mismas notas — más luminoso y abierto.'}],
      [up(7), true,  {en:'Dominant',    es:'Dominante'},    {en:'Up a fifth — lifts the energy.',     es:'Una quinta arriba — sube la energía.'}],
      [up(5), true,  {en:'Subdominant', es:'Subdominante'}, {en:'Down a fifth — warmer, grounded.',   es:'Una quinta abajo — más cálido, asentado.'}],
      [homePc, !homeMaj, {en:'Parallel',es:'Paralela'},     {en:'Same root, flips the mood.',         es:'Misma raíz — voltea el mood.'}],
      [up(2), true,  {en:'Up a step',   es:'Un tono arriba'},{en:'The classic final-chorus lift.',    es:'El subidón clásico de estribillo.'}],
    ];
    return defs.map(([pc,maj,label,why]) => ({
      label:L(label), why:L(why), name:_kname(pc,maj),
      pivot:_pivot(homePc,homeMaj,pc,maj), ..._place(pc,maj),
    }));
  }

  // ── Render ─────────────────────────────────────────
  let _open = false;
  const el  = () => document.getElementById('colorPanel');

  function render() {
    const box = el(); if (!box) return;
    const es  = st.lang === 'es';
    const cc  = colorChords();
    const mts = modTargets();

    box.innerHTML = `
      <div class="mod-head">
        <span class="mod-title">${es ? 'Más allá de la escala' : 'Beyond the key'}</span>
        <button class="mod-x" data-ico="close" data-ico-size="12" data-act="color.close" aria-label="Close"></button>
      </div>
      <div class="cx-body">

        <p class="cx-intro">${es
          ? 'Acordes de fuera de tu tonalidad. <b>Préstalos</b> para dar color y volver, o <b>modula</b> a otra tonalidad.'
          : 'Chords from outside your key. <b>Borrow</b> one for colour and return, or <b>modulate</b> to a new key.'}</p>

        <div class="cx-section">
          <div class="cx-label">
            <span class="cx-tag">${es ? 'PRÉSTAMO' : 'BORROW'}</span>
            <span class="cx-sub">${es ? 'toca para oírlo · ＋ lo añade a tu progresión' : 'tap to hear · ＋ adds it to your progression'}</span>
          </div>
          <div class="mod-list">
            ${cc.map((c,i) => `
              <div class="cc-item" data-act="color.preview" data-idx="${i}">
                <span class="mod-role">${L(c.role)}</span>
                <span class="cc-name">${c.name}</span>
                <span class="mod-why">${L(c.why)}</span>
                <button class="cc-add" data-act="color.add" data-idx="${i}" data-stop="1" aria-label="${es?'Añadir a la progresión':'Add to progression'}" data-ico="plus" data-ico-size="14"></button>
              </div>`).join('')}
          </div>
        </div>

        <div class="cx-sep">
          <span>${es ? 'o llévate la música a otro lugar' : 'or take the music somewhere new'}</span>
        </div>

        <div class="cx-section">
          <div class="cx-label">
            <span class="cx-tag cx-tag-mod">${es ? 'MODULACIÓN' : 'MODULATE'}</span>
            <span class="cx-sub">${es ? 'añade el acorde pivote (el puente) y cambia de tonalidad' : 'adds the pivot chord (the bridge), then changes key'}</span>
          </div>
          <div class="mod-list">
            ${mts.map((tg,i) => `
              <button class="cx-mod-item${tg.pivot ? '' : ' no-pivot'}" data-act="color.modulate" data-idx="${i}">
                <span class="mod-role">${tg.label}</span>
                <span class="cx-mod-name">${tg.name}</span>
                ${tg.pivot ? `<span class="cx-pivot">${es?'añade':'add'} <b>${tg.pivot.name}</b> →</span>` : '<span></span>'}
                <span class="cx-mod-why">${tg.why}</span>
              </button>`).join('')}
          </div>
        </div>

      </div>`;
    if (typeof applyIcons === 'function') applyIcons(box);
  }

  function preview(i) {
    const c = colorChords()[i]; if (!c) return;
    const pitches = c.iv.map(x => c.pc + x);
    if (typeof setActiveChord === 'function') setActiveChord(pitches);
    if (typeof AudioEngine === 'object') AudioEngine.playChord(pitches);
    el()?.querySelectorAll('.cc-item').forEach((it,j) => it.classList.toggle('on', j===i));
  }

  function add(i) {
    const c = colorChords()[i]; if (!c) return;
    if (typeof HistoryEngine === 'object' && HistoryEngine.addCustom)
      HistoryEngine.addCustom({ note:nm(c.pc), chord:c.name, quality:c.quality, variant:c.variant });
    if (typeof tel === 'function') tel('color_chord', { role:c.role.en });
    if (typeof AudioEngine === 'object') AudioEngine.playChord(c.iv.map(x => c.pc+x));
  }

  function jump(sector, view) {
    if (typeof wheelLocked !== 'undefined' && wheelLocked && typeof setWheelLock === 'function') setWheelLock(false);
    AppActions.setKey(sector);
    AppActions.setWheelView(view);
    close();
  }

  // Modulate = drop the pivot chord (the bridge, shared by both keys) into the
  // progression, then switch the wheel to the new key so what you add next is in it.
  function modulateTo(i) {
    const tg = modTargets()[i]; if (!tg) return;
    if (tg.pivot) {
      const q = tg.pivot.q, quality = q === 'm' ? 'Min' : q === '°' ? 'Dim' : 'Maj';
      const iv = q === 'm' ? MIN : q === '°' ? [0,3,6] : MAJ;
      if (typeof HistoryEngine === 'object' && HistoryEngine.addCustom)
        HistoryEngine.addCustom({ note:nm(tg.pivot.pc), chord:tg.pivot.name, quality, variant:null });
      if (typeof AudioEngine === 'object') AudioEngine.playChord(iv.map(x => tg.pivot.pc + x));
    }
    if (typeof tel === 'function') tel('modulate', { pivot: !!tg.pivot });
    jump(tg.sector, tg.view);
  }

  function show() {
    const b = el(); if (!b) return;
    render(); b.hidden = false;
    requestAnimationFrame(() => b.classList.add('open'));
    _open = true;
    if (typeof OverlayManager === 'object') OverlayManager.opened('color-chords');
    if (typeof FocusTrap === 'object') FocusTrap.activate(b);
  }
  function close() {
    const b = el(); if (!b) return;
    b.classList.remove('open'); _open = false;
    setTimeout(() => { if (!_open) b.hidden = true; }, 200);
    if (typeof FocusTrap === 'object') FocusTrap.release(b);
  }
  function toggle() { _open ? close() : show(); }

  return { toggle, show, close, preview, add, jump, modulateTo, isOpen: () => _open };
})();
