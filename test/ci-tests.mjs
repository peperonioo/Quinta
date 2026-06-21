// Headless CI runner: load the built app in Chromium and run EFC_DEV.runTests().
// Exits non-zero if any test fails. Used by .github/workflows/ci.yml.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const FILE = pathToFileURL(path.resolve('dist/Easy_Fifth_Circle.html')).href;

const launchOpts = { headless: true };
if (process.env.PW_EXECUTABLE_PATH) launchOpts.executablePath = process.env.PW_EXECUTABLE_PATH;  // CI (setup-chrome)
else if (process.env.PW_CHANNEL)    launchOpts.channel = process.env.PW_CHANNEL;                  // local ("chrome")

const browser = await chromium.launch(launchOpts);
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof EFC_DEV === 'object' && typeof EFC_DEV.runTests === 'function', null, { timeout: 20000 });

  const res = await page.evaluate(() => {
    const r = EFC_DEV.runTests();
    return { ok: r.ok, total: r.results.length, fails: r.results.filter(t => !t.ok).map(f => f.name) };
  });

  const passed = res.total - res.fails.length;
  console.log(`EFC_DEV: ${passed}/${res.total} tests passed`);
  if (res.fails.length) console.error('FAILED:', res.fails.join(', '));
  // Page errors are informational (service worker on file:// etc.) — don't fail on them.
  if (pageErrors.length) console.warn(`(${pageErrors.length} page error(s), e.g. ${pageErrors[0].slice(0, 100)})`);

  await browser.close();
  process.exit(res.ok && res.fails.length === 0 ? 0 : 1);
} catch (err) {
  console.error('Runner error:', err.message);
  await browser.close();
  process.exit(1);
}
