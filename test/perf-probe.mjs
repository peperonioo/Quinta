// Performance probe (V6.47) — the "does it FEEL tight" numbers.
//
// Emulates a mid-range phone (390×844, CPU throttled 4×) and drives REAL scroll
// gestures through the compositor (CDP Input.synthesizeScrollGesture), per mode.
// Reports frame pacing (p50/p95, janky frames >34ms = a dropped frame at 30Hz
// budget, >50ms = visible hitch), and the main-thread work the scroll caused:
// style recalcs, layouts, and their durations. Plus an idle window, which is
// where always-on costs (background loops, infinite animations) show up.
//
// Headless Chrome renders on the CPU (no GPU), so absolute GPU-bound numbers are
// pessimistic; the probe is for BEFORE/AFTER comparisons and for main-thread
// work, which it measures faithfully.
//
//   node test/perf-probe.mjs            → table
//   node test/perf-probe.mjs --json     → machine-readable (for the audit)

import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const FILE = pathToFileURL(path.resolve('dist/index.html')).href;
const launchOpts = { headless: true };
if (process.env.PW_EXECUTABLE_PATH) launchOpts.executablePath = process.env.PW_EXECUTABLE_PATH;
const JSON_OUT = process.argv.includes('--json');

const browser = await chromium.launch(launchOpts);
const results = {};

async function probe(label, vp, mobile, mode) {
  const page = await browser.newPage({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const cdp = await page.context().newCDPSession(page);
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ActionRegistry === 'object');
  await page.waitForTimeout(1200);
  await page.evaluate(m => {
    document.getElementById('splash')?.remove();
    try { Onboarding.close(); } catch (_) {}
    try { Comeback.close(); } catch (_) {}
    switchTab('build'); if (!(st.history || []).length) surpriseMe();
    Inspector.clear();
    switchTab(m); scrollTo(0, 0);
  }, mode);
  // surpriseMe() STARTS playback after a beat; stopping it in the same tick
  // stops nothing. Let it start, then stop both transports — otherwise "idle"
  // measures a song playing (it did, in the first V6.47 baseline).
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    try { if (typeof _progRAF !== 'undefined' && _progRAF) stopProgression(); } catch (_) {}
    try { if (typeof playing !== 'undefined' && playing) stopPlay(); } catch (_) {}
  });
  await page.waitForTimeout(600);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const metrics = async () => Object.fromEntries(
    (await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));

  // ── idle window: always-on cost ──
  const i0 = await metrics();
  await page.waitForTimeout(2000);
  const i1 = await metrics();
  const idleBusy = ((i1.TaskDuration - i0.TaskDuration) / 2) * 100;   // % of main thread

  // ── scroll gesture: frame pacing + work ──
  await page.evaluate(() => {
    window.__frames = []; let last = performance.now();
    const tick = t => { window.__frames.push(t - last); last = t; if (window.__rec) requestAnimationFrame(tick); };
    window.__rec = true; requestAnimationFrame(tick);
  });
  const s0 = await metrics();
  const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const dist = Math.max(200, Math.min(900, h));
  await cdp.send('Input.synthesizeScrollGesture', {
    x: Math.round(vp.width / 2), y: Math.round(vp.height * 0.6),
    yDistance: -dist, speed: 900, gestureSourceType: mobile ? 'touch' : 'mouse', repeatCount: 1,
  });
  await cdp.send('Input.synthesizeScrollGesture', {
    x: Math.round(vp.width / 2), y: Math.round(vp.height * 0.4),
    yDistance: dist, speed: 900, gestureSourceType: mobile ? 'touch' : 'mouse', repeatCount: 1,
  });
  const s1 = await metrics();
  const frames = await page.evaluate(() => { window.__rec = false; return window.__frames.slice(2); });
  frames.sort((a, b) => a - b);
  const pct = q => frames.length ? frames[Math.min(frames.length - 1, Math.floor(q * frames.length))] : 0;

  results[label] = {
    frames: frames.length,
    p50: +pct(0.5).toFixed(1),
    p95: +pct(0.95).toFixed(1),
    jank34: frames.filter(f => f > 34).length,
    hitch50: frames.filter(f => f > 50).length,
    styleRecalcs: s1.RecalcStyleCount - s0.RecalcStyleCount,
    styleMs: +((s1.RecalcStyleDuration - s0.RecalcStyleDuration) * 1000).toFixed(0),
    layouts: s1.LayoutCount - s0.LayoutCount,
    layoutMs: +((s1.LayoutDuration - s0.LayoutDuration) * 1000).toFixed(0),
    scriptMs: +((s1.ScriptDuration - s0.ScriptDuration) * 1000).toFixed(0),
    idleBusyPct: +idleBusy.toFixed(1),
    nodes: await page.evaluate(() => document.getElementsByTagName('*').length),
    blurLayers: await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => {
      const cs = getComputedStyle(e);
      const bf = cs.backdropFilter || cs.webkitBackdropFilter;
      const r = e.getBoundingClientRect();
      return bf && bf !== 'none' && r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
    }).length),
  };
  await page.close();
}

const MOBILE = { width: 390, height: 844 }, DESK = { width: 1440, height: 900 };
for (const m of ['explore', 'build', 'instrument', 'styles']) await probe(`mobile·${m}`, MOBILE, true, m);
for (const m of ['explore', 'build']) await probe(`desktop·${m}`, DESK, false, m);
await browser.close();

if (JSON_OUT) { console.log(JSON.stringify(results)); process.exit(0); }
const cols = ['p50', 'p95', 'jank34', 'hitch50', 'styleRecalcs', 'styleMs', 'layouts', 'layoutMs', 'scriptMs', 'idleBusyPct', 'blurLayers', 'nodes'];
console.log('mode'.padEnd(18) + cols.map(c => c.padStart(12)).join(''));
for (const [k, v] of Object.entries(results)) console.log(k.padEnd(18) + cols.map(c => String(v[c]).padStart(12)).join(''));
