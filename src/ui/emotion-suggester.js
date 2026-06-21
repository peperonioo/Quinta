// ── EMOTION SUGGESTER (V5.44) ──────────────────────────
// Maps human emotions to musically-grounded degree sequences.
// Tapping a chip previews the sequence in the current key/mode,
// then "Load progression" seeds the builder with it.
const EmotionSuggester = (() => {
  const EMOTIONS = [
    { id:'alegre',       icon:'☀', label:{en:'Happy',       es:'Alegre'},
      seq:[0,4,5,3],
      note:{en:'The axis: feel-good, driving, timeless.',              es:'El eje pop: positivo, con impulso, atemporal.'} },
    { id:'triste',       icon:'◆', label:{en:'Sad',         es:'Triste'},
      seq:[5,3,1,5],
      note:{en:'Stays in the minor zone — vi leads, resolves nowhere.', es:'Se queda en la zona menor — vi lidera, sin resolución.'} },
    { id:'epico',        icon:'▲', label:{en:'Epic',        es:'Épico'},
      seq:[0,4,5,2],
      note:{en:'Ascending arc: V for power, vi emotion, iii drama.',   es:'Arco ascendente: V potencia, vi emoción, iii drama.'} },
    { id:'nostalgico',   icon:'◎', label:{en:'Nostalgic',   es:'Nostálgico'},
      seq:[0,5,3,4],
      note:{en:'The golden 50s loop: I → vi → IV → V.',               es:'El bucle dorado de los 50: I → vi → IV → V.'} },
    { id:'sonador',      icon:'✦', label:{en:'Dreamy',      es:'Soñador'},
      seq:[3,0,5,3],
      note:{en:'Opens on IV — no hard cadence, suspended, floating.',  es:'Comienza en IV — sin cadencia dura, suspendido, flotante.'} },
    { id:'tenso',        icon:'⚡', label:{en:'Tense',       es:'Tenso'},
      seq:[1,4,0,4],
      note:{en:'ii → V pulls home then returns — never fully settled.', es:'ii → V tira a casa y vuelve — siempre sin resolver del todo.'} },
    { id:'romantico',    icon:'♡', label:{en:'Romantic',    es:'Romántico'},
      seq:[5,3,0,4],
      note:{en:'vi first — emotional depth before lifting home.',       es:'vi primero — profundidad emocional antes de volver a casa.'} },
    { id:'oscuro',       icon:'◗', label:{en:'Dark',        es:'Oscuro'},
      seq:[5,2,3,6],
      note:{en:'vi, iii and vii° cast long shadows across the arc.',   es:'vi, iii y vii° proyectan sombra profunda en el arco.'} },
    { id:'esperanzador', icon:'◇', label:{en:'Hopeful',     es:'Esperanzador'},
      seq:[0,3,0,4],
      note:{en:'I → IV warms → I again → V lifts. Open, forward.',    es:'I → IV calienta → I de nuevo → V eleva. Abierto, hacia delante.'} },
  ];

  let _open = false;
  let _sel  = null;
  const el  = () => document.getElementById('emotionPanel');
  const L   = o => o[st.lang] || o.en;

  function degSeq(seq) {
    const row = (typeof gc === 'function') ? gc() : [];
    return seq.map(i => {
      const d = row[i];
      if (!d) return '?';
      return (typeof casedRoman === 'function') ? casedRoman(d.degree, d.quality) : d.degree;
    }).join(' · ');
  }

  function render() {
    const box = el(); if (!box) return;
    const es = st.lang === 'es';
    const selected = _sel ? EMOTIONS.find(e => e.id === _sel) : null;
    box.innerHTML = `
      <div class="mod-head">
        <span class="mod-title">${es ? '¿Cómo quieres sonar?' : 'How should it feel?'}</span>
        <button class="mod-x" onclick="EmotionSuggester.close()" aria-label="Close">✕</button>
      </div>
      <div class="em-grid">
        ${EMOTIONS.map(e => `
          <button class="em-chip${_sel === e.id ? ' on' : ''}"
            onclick="EmotionSuggester.select('${e.id}')"
            aria-pressed="${_sel === e.id}">
            <span class="em-icon" aria-hidden="true">${e.icon}</span>
            <span class="em-label">${L(e.label)}</span>
          </button>`).join('')}
      </div>
      ${selected
        ? `<div class="em-preview">
             <div class="em-seq">${degSeq(selected.seq)}</div>
             <div class="em-note">${L(selected.note)}</div>
           </div>`
        : `<div class="em-placeholder"><span>${es ? 'Elige una emoción' : 'Choose a feeling'}</span></div>`}
      <button class="em-apply"${!selected ? ' disabled' : ''} onclick="EmotionSuggester.apply()">
        ${es ? 'Cargar progresión' : 'Load progression'}
      </button>`;
  }

  function show() {
    const box = el(); if (!box) return;
    _sel = null;
    render();
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('open'));
    _open = true;
    if (typeof OverlayManager === 'object') OverlayManager.opened('emotion');
  }

  function close() {
    const box = el(); if (!box) return;
    box.classList.remove('open');
    _open = false;
    setTimeout(() => { if (!_open) box.hidden = true; }, 200);
  }

  function toggle() { _open ? close() : show(); }

  function select(id) {
    _sel = (_sel === id) ? null : id;
    render();
  }

  function apply() {
    const e = EMOTIONS.find(x => x.id === _sel); if (!e) return;
    st.history = [];
    e.seq.forEach(idx => HistoryEngine.addDegree(idx));
    saveState();
    RenderEngine.full();
    if (typeof tel === 'function') tel('emotion_' + e.id);
    close();
    if (typeof _shareToast === 'function') _shareToast(L(e.label));
  }

  return { toggle, show, close, select, apply, isOpen: () => _open };
})();
