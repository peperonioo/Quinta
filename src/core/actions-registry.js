// ── ACTION REGISTRY + EVENT DELEGATION (V6.18) ────────
// The debt the audit named: the UI is wired with inline handlers written inside
// template literals, so renaming a global kills a button silently at runtime.
// V6.15 added a guard that walks every inline handler and checks the identifiers
// still exist — a good net, but it only catches *missing* names, and only for
// markup that happens to be in the DOM when the tests run.
//
// This replaces the mechanism instead of guarding it. Markup declares WHAT it
// wants (`data-act="lib.load"` + data-* arguments); the registry below is the
// single place that maps a name to a function. Consequences:
//   · one delegated listener per event type, not hundreds of handler strings;
//   · a rename breaks in ONE place — here — instead of in N template literals;
//   · dynamically rendered markup needs no re-binding, ever;
//   · the registry is enumerable, so a test can assert every declared action
//     resolves (see "Action registry integrity" in dev/tests.js).
//
// Args come from data attributes, never from a parsed string: nothing is eval'd.

const ActionRegistry = (() => {
  const map = Object.create(null);

  // Register one action. Throws on a duplicate name — two features silently
  // sharing an action name is exactly the kind of bug this file exists to kill.
  function add(name, fn) {
    if (map[name]) throw new Error('ActionRegistry: duplicate action ' + name);
    map[name] = fn;
  }
  function addAll(obj) { Object.keys(obj).forEach(k => add(k, obj[k])); }
  function has(name) { return !!map[name]; }
  function names() { return Object.keys(map); }

  // Run an action by name. Unknown names are reported loudly in dev and ignored
  // in production — a dead button must never take the whole page down.
  function run(name, el, ev) {
    const fn = map[name];
    if (!fn) {
      if (typeof console !== 'undefined') console.warn('[action] unknown:', name);
      return;
    }
    try { fn(el, ev); }
    catch (err) { if (typeof console !== 'undefined') console.error('[action] ' + name, err); }
  }

  // One listener per event type, on the document, capturing nothing special.
  // `data-act` fires on click; `data-act-down` on pointerdown (drag starts, which
  // must not wait for a click); `data-act-key` on Enter/Space for keyboard access.
  function _delegate() {
    document.addEventListener('click', ev => {
      const el = ev.target.closest && ev.target.closest('[data-act]');
      if (!el) return;
      run(el.dataset.act, el, ev);
    });
    document.addEventListener('pointerdown', ev => {
      const el = ev.target.closest && ev.target.closest('[data-act-down]');
      if (!el) return;
      run(el.dataset.actDown, el, ev);
    });
    document.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const el = ev.target.closest && ev.target.closest('[data-act-key]');
      if (!el) return;
      ev.preventDefault();
      run(el.dataset.actKey, el, ev);
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _delegate);
    else _delegate();
  }

  // Test hook: the source of a registered lambda, so the suite can check the
  // function it points at still exists. Not used by the app itself.
  function _peek(name) { return map[name] ? map[name].toString() : ''; }

  return { add, addAll, has, names, run, _peek };
})();

// Small helpers for reading typed arguments off the element.
const _aInt = (el, k) => parseInt(el.dataset[k], 10);
const _aStr = (el, k) => el.dataset[k];
