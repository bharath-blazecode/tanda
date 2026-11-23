// Compare four original thermal-ticket animated timelines to the merged Phase D baseline.
// Set KACHKA_REFERENCE_ORIGIN and KACHKA_TEST_ORIGIN to local production servers.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.KACHKA_TEST_ORIGIN;
const reference = process.env.KACHKA_REFERENCE_ORIGIN;
assert(base && reference && ['localhost', '127.0.0.1'].includes(new URL(base).hostname));
async function compareAnimatedReceipts(browser, referenceOrigin) {
  assert(['localhost', '127.0.0.1'].includes(new URL(referenceOrigin).hostname));
  const pages = [];
  for (const origin of [referenceOrigin, base]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-AU',
      reducedMotion: 'no-preference' });
    await page.goto(origin + '/result?preview');
    await page.evaluate(() => document.fonts.ready);
    pages.push(page);
  }
  for (const verdict of ['steady', 'wired', 'tipsy', 'wobbly']) {
    for (const page of pages) {
      await page.getByRole('button', { name: verdict, exact: true }).click();
      await page.getByRole('button', { name: 'Replay animation' }).click();
    }
    for (const time of [320, 1100, 1800]) {
      const frames = [];
      for (const page of pages) {
        const ticket = page.locator('.result-ticket');
        await ticket.evaluate((el, ms) => el.getAnimations({ subtree: true }).forEach(a => {
          a.pause(); a.currentTime = ms;
        }), time);
        frames.push(await ticket.screenshot());
      }
      assert(frames[0].equals(frames[1]), verdict + ' at ' + time + ' ms');
    }
    console.log('Identical preview frames at 320, 1100 and 1800 ms:', verdict);
  }
  for (const page of pages) await page.close();
}


(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--disable-webgl'] });
  try { await compareAnimatedReceipts(browser, reference); }
  finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
