// ── THEORY RENDERER ───────────────────────────────────
// Renders scale info cards, degree row, info boxes.

function renderScaleChips(containerId) {
  const root = document.getElementById(containerId); if (!root) return;
  const scale = gs();
  root.innerHTML = scale.map((n, i) =>
    `<span class="chip ${i === 0 ? 'root-chip' : ''}">${n}</span>`
  ).join('');
}

function renderTheory() {
  // Key / Root card
  const sk = document.getElementById('sideKey');
  const sm = document.getElementById('sideMode');
  if (sk) sk.textContent = displayKeyLabel();
  if (sm) sm.textContent = gm().name;

  // Relative card — its label flips between "Relative minor" (major view) and
  // "Relative major" (minor view) so it matches what grel() actually returns.
  const rmb = document.getElementById('relMinorBig');
  if (rmb) rmb.textContent = grel();
  const relLabel = document.querySelector('[data-i18n^="labels.relative"]');
  if (relLabel) {
    const key = st.wheelView === 'minor' ? 'labels.relativeMajor' : 'labels.relativeMinor';
    relLabel.setAttribute('data-i18n', key);
    relLabel.textContent = t(key);
  }

  // Accidentals card — the key signature of the current scale, derived from its
  // PARENT major key (mode-aware, so e.g. C natural minor = 3 flats). Computed
  // from the tonic pitch + the mode's offset in fifths, which avoids the
  // flat-biased note spelling that made earlier attempts read sharp keys wrong.
  const MODE_FIFTHS_OFF = { ionian:0, lydian:1, mixolydian:-1, dorian:-2, aeolian:-3, phrygian:-4, locrian:-5 };
  const tonicPitch = ni(st.key);                       // same root gs() uses
  const fifthsIdx  = ((tonicPitch * 7) % 12 + 12) % 12;
  const off        = MODE_FIFTHS_OFF[st.mode] ?? 0;
  const accStr     = ACC[((fifthsIdx + off) % 12 + 12) % 12];
  const accEl = document.getElementById('accidentals');
  const accType = document.getElementById('accidentalType');
  if (accEl)   accEl.textContent   = accStr === '0' ? '♮ None' : accStr;
  if (accType) accType.textContent = accStr === '0' ? 'Natural' : accStr.includes('♯') ? 'Sharps' : 'Flats';

  // Major/minor toggle buttons
  document.getElementById('viewMajorBtn')?.classList.toggle('active', st.wheelView !== 'minor');
  document.getElementById('viewMinorBtn')?.classList.toggle('active', st.wheelView === 'minor');

  // Degrees row
  const dRow = document.getElementById('degrees'); if (!dRow) return;
  const chords = gc();
  dRow.innerHTML = chords.map((c, i) => `
    <div class="degree ${i === 0 ? 'tonic' : ''} ${i === curDeg ? 'active-deg' : ''}"
      onclick="showDegreePopup(${i})"
      data-degree-index="${i}">
      <div class="roman">${c.degree}</div>
      <div class="dn">${c.chord}</div>
      <div class="dq">${c.quality}</div>
    </div>`).join('');

  // Scale notes boxes
  renderScaleChips('scaleNotes');
  renderScaleChips('scaleBox');

  // Re-render mode menu label
  renderModeMenu();
}

function setWheelView(view) { AppActions.setWheelView(view); }
