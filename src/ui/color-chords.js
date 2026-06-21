// ── COLOR CHORDS (V5.36 · transport-sheet branch) ─────
// Chords from OUTSIDE the current scale — secondary dominants and borrowed
// chords — each with what it does and where it resolves. Tap a row to hear it
// on the boards, tap "+" to drop it into the progression. The producer's spice.
const ColorChords = (() => {
  const DOM7 = [0, 4, 7, 10], MAJ = [0, 4, 7], MIN = [0, 3, 7];
  const L  = o => o[st.lang] || o.en;
  const nm = pc => dn(na(((pc % 12) + 12) % 12));

  function chords() {
    const T   = ni((typeof gr === 'function' && gr()[0]) ? gr()[0] : (st.key || 'C'));
    const maj = (typeof modeIsMinor === 'function') ? !modeIsMinor(st.mode) : (st.wheelView !== 'minor');
    const up  = n => (T + n) % 12;
    const dom7  = (pc, role, why) => ({ pc, iv: DOM7, name: nm(pc) + '7', quality: 'Maj', variant: '7',  role, why });
    const major = (pc, role, why) => ({ pc, iv: MAJ,  name: nm(pc),       quality: 'Maj', variant: null, role, why });
    const minor = (pc, role, why) => ({ pc, iv: MIN,  name: nm(pc) + 'm', quality: 'Min', variant: null, role, why });

    return maj ? [
      dom7 (up(2),  { en: 'V7 / V',  es: 'V7 / V'  }, { en: 'Tension that pulls hard to V.', es: 'Tensión que tira fuerte hacia el V.' }),
      dom7 (up(4),  { en: 'V7 / vi', es: 'V7 / vi' }, { en: 'Leads to the relative minor.',  es: 'Lleva a la relativa menor.' }),
      minor(up(5),  { en: 'iv',      es: 'iv'      }, { en: 'Borrowed minor — bittersweet, → I.', es: 'Menor prestado — agridulce, → I.' }),
      major(up(10), { en: '♭VII',    es: '♭VII'    }, { en: 'Rock / mixolydian colour, → I.', es: 'Color rock / mixolidio, → I.' }),
      major(up(8),  { en: '♭VI',     es: '♭VI'     }, { en: 'Cinematic lift, → I or V.',     es: 'Subida cinematográfica, → I o V.' }),
    ] : [
      dom7 (up(7),  { en: 'V7',          es: 'V7'           }, { en: 'The strong pull home (harmonic minor).', es: 'El tirón fuerte a casa (menor armónica).' }),
      major(up(1),  { en: '♭II',         es: '♭II'          }, { en: 'Neapolitan — dark, dramatic, → V.',      es: 'Napolitana — oscura y dramática, → V.' }),
      major(up(5),  { en: 'IV',          es: 'IV'           }, { en: 'Dorian brightening.',                    es: 'Brillo dórico.' }),
      dom7 (up(2),  { en: 'V7 / V',      es: 'V7 / V'       }, { en: 'Pulls toward the dominant.',             es: 'Tira hacia el dominante.' }),
      major(up(0),  { en: 'I (Picardy)', es: 'I (Picardía)' }, { en: 'A hopeful major ending.',               es: 'Un final mayor esperanzado.' }),
    ];
  }

  let _open = false;
  const el = () => document.getElementById('colorPanel');

  function render() {
    const box = el(); if (!box) return;
    const es = st.lang === 'es';
    box.innerHTML = `
      <div class="mod-head">
        <span class="mod-title">${es ? 'Acordes de color' : 'Colour chords'}</span>
        <button class="mod-x" onclick="ColorChords.close()" aria-label="Close">✕</button>
      </div>
      <div class="mod-list">
        ${chords().map((c, i) => `
          <div class="cc-item" onclick="ColorChords.preview(${i})">
            <span class="mod-role">${L(c.role)}</span>
            <span class="cc-name">${c.name}</span>
            <span class="mod-why">${L(c.why)}</span>
            <button class="cc-add" onclick="event.stopPropagation();ColorChords.add(${i})" aria-label="Add to progression">＋</button>
          </div>`).join('')}
      </div>`;
  }

  function preview(i) {
    const c = chords()[i]; if (!c) return;
    const pitches = c.iv.map(x => c.pc + x);
    if (typeof setActiveChord === 'function') setActiveChord(pitches);
    if (typeof AudioEngine === 'object') AudioEngine.playChord(pitches);
    el()?.querySelectorAll('.cc-item').forEach((it, j) => it.classList.toggle('on', j === i));
  }

  function add(i) {
    const c = chords()[i]; if (!c) return;
    if (typeof HistoryEngine === 'object' && HistoryEngine.addCustom) {
      HistoryEngine.addCustom({ note: nm(c.pc), chord: c.name, quality: c.quality, variant: c.variant });
    }
    if (typeof tel === 'function') tel('color_chord', { role: c.role.en });
    if (typeof AudioEngine === 'object') AudioEngine.playChord(c.iv.map(x => c.pc + x));
  }

  function show()  { const b = el(); if (!b) return; render(); b.hidden = false; requestAnimationFrame(() => b.classList.add('open')); _open = true;
                     if (typeof OverlayManager === 'object') OverlayManager.opened('color-chords'); }
  function close() { const b = el(); if (!b) return; b.classList.remove('open'); _open = false; setTimeout(() => { if (!_open) b.hidden = true; }, 200); }
  function toggle(){ _open ? close() : show(); }

  return { toggle, show, close, preview, add, isOpen: () => _open };
})();
