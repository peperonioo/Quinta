// ── DOCUMENT (V2 · fase B2) ───────────────────────────
// Quinta always had a document — the progression is what you save, share, export
// and take home — but the architecture treated it as one panel among many. This
// gives it an identity: a name, a header, and the file-level actions where
// everyone looks for them. Library and the "···" menu stop being panels.
const Doc = (() => {
  const es = () => st.lang === 'es';
  const L  = (en, e) => (es() ? e : en);

  function name() { return st.docName || L('Untitled', 'Sin título'); }
  function setName(v) {
    st.docName = (v || '').trim().slice(0, 40) || null;
    saveState(); render();
    tel('doc_rename');
  }

  function save() {
    const h = Array.isArray(st.history) ? st.history : [];
    if (!h.length) { _shareToast(L('Build something first', 'Crea algo primero')); return; }
    const list = Library._read();
    const id = st.docId || (Date.now() + '-' + Math.random().toString(36).slice(2));
    const rec = {
      id, name: name(), key: st.key, mode: st.mode, tonality: st.tonality, bpm: st.bpm,
      history: JSON.parse(JSON.stringify(h)), ts: Date.now(),
    };
    const at = list.findIndex(p => p.id === id);
    if (at >= 0) list[at] = rec; else list.unshift(rec);
    Library._write(list);
    st.docId = id; saveState();
    tel('doc_save', { bars: h.length });
    _shareToast(L('Saved', 'Guardado'));
    render();
  }

  // Starting fresh is a document action, not a "clear" button hidden in a menu.
  function fresh() {
    snapshotAndOfferUndo('undo.cleared');
    st.history = []; st.docId = null; st.docName = null;
    saveState();
    if (typeof Inspector === 'object') Inspector.clear();
    RenderEngine.full();
    render();
  }

  function render() {
    const el = document.getElementById('docBar'); if (!el) return;
    const h = Array.isArray(st.history) ? st.history : [];
    const saved = !!st.docId;
    const isPlaying = (typeof playing !== 'undefined' && playing)
                   || (typeof _progRAF !== 'undefined' && _progRAF);
    const sect = st.activeSection || 'A';
    el.innerHTML = `
      <input class="doc-name" id="docName" value="${name().replace(/"/g, '&quot;')}"
        aria-label="${L('Document name', 'Nombre del documento')}"
        data-act-enter="doc.rename" placeholder="${L('Untitled', 'Sin título')}"
        title="${saved ? L('Saved', 'Guardado') : L('Not saved yet — Save lives under ···', 'Sin guardar — Guardar está en ···')}">
      <div class="sect-tabs" role="group" aria-label="${L('Song sections', 'Secciones')}">
        <button class="sect-tab${sect === 'A' ? ' active' : ''}" data-sect="A" data-act="section.go" data-id="A" aria-label="${L('Section A', 'Sección A')}">A</button>
        <button class="sect-tab${sect === 'B' ? ' active' : ''}" data-sect="B" data-act="section.go" data-id="B" aria-label="${L('Section B', 'Sección B')}">B</button>
      </div>
      <div class="doc-acts">
        <button class="builder-btn play${isPlaying ? ' is-stop playing' : ''}" id="playProgBtn" data-ico="${isPlaying ? 'stop' : 'play'}" data-act="prog.play"><span>${isPlaying ? t('play.stop') : t('builder.play')}</span></button>
        <button class="builder-btn export-cta" id="exportBtn" data-ico="download" data-act="export.open" ${h.length < 2 ? 'hidden' : ''}
          title="${L('Export as WAV, stems or MIDI', 'Exportar como WAV, stems o MIDI')}"><span data-i18n="builder.grpExport">${L('Export', 'Exportar')}</span></button>
        <button class="builder-btn opt" id="moreBtn" data-ico="more" data-act="builder.more" title="${L('More actions', 'Más acciones')}" aria-label="${L('More actions', 'Más acciones')}" aria-expanded="false"></button>
      </div>`;
    applyIcons(el);
  }

  return { render, save, fresh, setName, name };
})();
