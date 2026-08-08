// The /v2/ preview and the sampled-sound layer (V6.32).
//
// Every sampler used to fetch 'samples/...' relative to the page, which under
// /v2/ resolved to /v2/samples/ → 404 → the synth fallback. Nothing errored,
// nothing looked wrong headless; the preview simply shipped for weeks with no
// sampled piano, no guitar, and a drum kit whose synth kick is a ~60Hz sine a
// phone speaker cannot reproduce ("el ritmo no se escucha").
//
// This serves the repo root over HTTP — the same layout GitHub Pages serves —
// loads /v2/, and asserts the samples actually arrive and the kit gets READY.
// Run after `node build.js --v2`. ci-tests can't cover this: it runs on file://,
// where DrumKits deliberately skips loading.

import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.mp3': 'audio/mpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
               '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let fp = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (fp.endsWith('/') || fp.endsWith(path.sep)) fp = path.join(fp, 'index.html');
    const body = await readFile(fp);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

const launchOpts = { headless: true, args: ['--autoplay-policy=no-user-gesture-required'] };
if (process.env.PW_EXECUTABLE_PATH) launchOpts.executablePath = process.env.PW_EXECUTABLE_PATH;
else if (process.env.PW_CHANNEL)    launchOpts.channel = process.env.PW_CHANNEL;

const browser = await chromium.launch(launchOpts);
let failed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const misses = [];
  page.on('response', r => { if (r.url().includes('samples/') && r.status() !== 200) misses.push(`${r.status()} ${r.url()}`); });

  await page.goto(`http://localhost:${PORT}/v2/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ActionRegistry === 'object', null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    try { document.getElementById('splash')?.remove(); } catch (_) {}
    try { Onboarding.close(); } catch (_) {}
    try { Comeback.close(); } catch (_) {}
  });

  const r = await page.evaluate(async () => {
    const wait = ms => new Promise(res => setTimeout(res, ms));
    switchTab('build'); if (!(st.history || []).length) surpriseMe();
    await wait(500);
    if (typeof _progRAF !== 'undefined' && _progRAF) stopProgression();
    if (playing) stopPlay();
    AudioEngine.resume();                     // triggers the lazy sample loads
    if (!Rhythm.isOn()) Rhythm.toggle();
    const spy = { calls: 0, real: 0 };
    const kp = DrumKits.play.bind(DrumKits);
    DrumKits.play = (...a) => { spy.calls++; const ok = kp(...a); if (ok) spy.real++; return ok; };
    toggleProgPlay();
    // Poll until the kit actually voices a hit (decode is async and lazy).
    const t0 = Date.now();
    while (Date.now() - t0 < 8000 && !spy.real) await wait(200);
    stopPlay();
    return { root: SAMPLE_ROOT, real: spy.real, calls: spy.calls,
             kitStates: Object.fromEntries(Object.entries(DrumKits.kits).map(([k, v]) => [k, v.state])) };
  });

  if (r.root !== '../samples/') { console.error(`FAIL  SAMPLE_ROOT under /v2/ is '${r.root}'`); failed++; }
  if (!r.real)                  { console.error(`FAIL  drum kit never voiced a sampled hit (${r.calls} scheduled, states ${JSON.stringify(r.kitStates)})`); failed++; }
  if (misses.length)            { console.error('FAIL  non-200 sample fetches:', misses.slice(0, 5).join(' | ')); failed++; }

  console.log(failed ? 'V2 samples: FAILED' : `V2 samples: OK (${r.real}/${r.calls} hits on the real kit)`);
} catch (err) {
  console.error('Runner error:', err.message); failed++;
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
