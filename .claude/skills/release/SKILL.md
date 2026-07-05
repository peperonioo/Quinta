---
name: release
description: Ship a Quinta release — bump version+cache, build, verify headless (tests green), commit (auto-push deploys), confirm CI. Use after completing any user-visible change to the app.
---

# Quinta release cycle

Ship the working-tree changes as one release. Follow in order; abort (and say why)
if any verification fails.

## 1 · Bump

- `APP_VERSION` in `src/core/constants.js` — +0.01 (e.g. V6.04 → V6.05).
- `CACHE` in `sw.js` — same number (`efc-v6.05`).

## 2 · Build

```bash
node build.js     # → dist/Quinta.html + index.html
```

## 3 · Verify (headless, before committing)

Playwright-core + system Chrome against the built file. Template:

```js
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const b = await chromium.launch({ channel:'chrome', headless:true, args:['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport:{width:1280,height:880} });
await ctx.addInitScript(() => {
  try { localStorage.setItem('easy-fifth-circle:v1', JSON.stringify({ onboarded:true })); } catch(e){}
  if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject('off');
});
const p = await ctx.newPage();
await p.goto(pathToFileURL(path.resolve('dist/Quinta.html')).href, { waitUntil:'networkidle' });
await p.waitForTimeout(500);
const r = await p.evaluate(() => { const t = EFC_DEV.runTests();
  return { version: APP_VERSION, total: t.results.length, ok: t.ok,
           fails: t.results.filter(x=>!x.ok).map(x=>x.name) }; });
console.log(JSON.stringify(r)); await b.close();
```

- **All tests must be green** and `version` must be the new one.
- Additionally verify the specific change (evaluate state, dispatch pointer events,
  or element screenshots). If it needs sample/network loading, serve the repo root
  with a tiny `node:http` server instead of `file://`.
- Mobile-visual changes: screenshot at 430×880; desktop at 1280+.

## 4 · Commit (deploys automatically)

- Stage `src/ sw.js dist/ index.html` plus whatever else changed. Check for strays first.
- Message: `type(scope): summary (VX.XX)` + body explaining what/why + verification note.
- End with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Run with sandbox disabled — the post-commit hook pushes (needs network). Do NOT push manually.

## 5 · Confirm CI

```bash
sleep 45 && gh run list --limit 1
```
Must be `success`. If it failed, diagnose the root cause (don't just retry) and fix forward.

## 6 · Report

Tell the user (in Spanish): what shipped, the version, what was verified, and anything
they should feel-test on a real phone (haptics/sound don't exist headless).
