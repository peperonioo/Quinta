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
    el.innerHTML = `
      <input class="doc-name" id="docName" value="${name().replace(/"/g, '&quot;')}"
        aria-label="${L('Document name', 'Nombre del documento')}"
        data-act-enter="doc.rename" placeholder="${L('Untitled', 'Sin título')}">
      <div class="doc-acts">
        <button class="doc-btn" data-act="doc.save" title="${L('Save', 'Guardar')}">
          <span data-ico="library" data-ico-size="13"></span><span>${saved ? L('Saved', 'Guardado') : L('Save', 'Guardar')}</span>
        </button>
        <button class="doc-btn" data-act="doc.open" title="${L('Open', 'Abrir')}">${L('Open', 'Abrir')}</button>
        <button class="doc-btn${h.length >= 2 ? ' cta' : ''}" data-act="export.open" title="${L('Export', 'Exportar')}"
          ${h.length < 2 ? 'disabled' : ''}>
          <span data-ico="download" data-ico-size="13"></span><span>${L('Export', 'Exportar')}</span>
        </button>
        <button class="doc-btn" data-act="prog.share" title="${L('Share link', 'Compartir enlace')}"
          ${h.length ? '' : 'disabled'}><span data-ico="share" data-ico-size="13"></span></button>
        <button class="doc-btn" data-act="doc.new" title="${L('New', 'Nuevo')}">＋</button>
      </div>`;
    applyIcons(el);
  }

  return { render, save, fresh, setName, name };
})();
