// ── TELEMETRY (V5.43 · beacon V5.85) ──────────────────
// Privacy-first event layer. NOTHING is sent until ENDPOINT points at a collector
// you control (here: a free Google Apps Script that appends to a Sheet). Honours Do
// Not Track, carries no PII (just event names + coarse props), and batches via
// sendBeacon. A persistent anonymous visitor id (vid) makes RETENTION measurable
// (did they come back?) without identifying anyone; a per-load session id (sid)
// groups one visit. A local tally is always kept: Telemetry.tally().
const Telemetry = (() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwA3QUWJUYBQLFZ6q-lDXhemsnskUNPgDdW02uckB0_PIp7fpeRGaNaLt8fBGayIORZ/exec';
  const dnt = (typeof navigator !== 'undefined') && (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes' || window.doNotTrack === '1');
  const enabled = () => !!ENDPOINT && !dnt;
  const sid = Math.random().toString(36).slice(2, 10);  // per-load session id
  const TKEY = 'efc:telemetry', VKEY = 'efc:vid';
  // Persistent anonymous id — random, no PII. The only thing that makes "did this
  // person return?" answerable. Survives reloads; resets if they clear site data.
  const vid = (() => {
    try { let v = localStorage.getItem(VKEY); if (!v) { v = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); localStorage.setItem(VKEY, v); } return v; }
    catch (_) { return 'anon'; }
  })();
  let queue = [];

  function bump(event) {
    try { const t = JSON.parse(localStorage.getItem(TKEY) || '{}'); t[event] = (t[event] || 0) + 1; localStorage.setItem(TKEY, JSON.stringify(t)); } catch (_) {}
  }
  function track(event, props) {
    if (!event) return;
    bump(event);                                        // local tally always
    if (!enabled()) return;
    queue.push({ e: event, p: props || {}, t: Date.now() });
    if (queue.length >= 12) flush();
  }
  function flush() {
    if (!enabled() || !queue.length) return;
    const payload = JSON.stringify({ vid, sid, v: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''), events: queue });
    queue = [];
    try { navigator.sendBeacon(ENDPOINT, payload); } catch (_) {}
  }
  if (typeof addEventListener === 'function') {
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    addEventListener('pagehide', flush);                // belt-and-braces for mobile tab close
  }
  return { track, flush, tally: () => { try { return JSON.parse(localStorage.getItem(TKEY) || '{}'); } catch { return {}; } } };
})();
function tel(event, props) { if (typeof Telemetry === 'object') Telemetry.track(event, props); }
