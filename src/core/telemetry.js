// ── TELEMETRY (V5.43) ─────────────────────────────────
// Privacy-first, opt-in event layer. NOTHING is sent until you set ENDPOINT to a
// collector you control (e.g. a Plausible/Umami/own endpoint). It honours Do Not
// Track, carries no PII (just event names + coarse props), uses an ephemeral
// per-session id, and batches via sendBeacon. A local tally is always kept so the
// data is inspectable in the console even with no endpoint: Telemetry.tally().
const Telemetry = (() => {
  const ENDPOINT = '';                                  // ← set to enable remote sending
  const dnt = (typeof navigator !== 'undefined') && (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes' || window.doNotTrack === '1');
  const enabled = () => !!ENDPOINT && !dnt;
  const sid = Math.random().toString(36).slice(2, 10);  // ephemeral; not persisted
  const TKEY = 'efc:telemetry';
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
    const payload = JSON.stringify({ sid, v: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''), events: queue });
    queue = [];
    try { navigator.sendBeacon(ENDPOINT, payload); } catch (_) {}
  }
  if (typeof addEventListener === 'function') {
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }
  return { track, flush, tally: () => { try { return JSON.parse(localStorage.getItem(TKEY) || '{}'); } catch { return {}; } } };
})();
function tel(event, props) { if (typeof Telemetry === 'object') Telemetry.track(event, props); }
