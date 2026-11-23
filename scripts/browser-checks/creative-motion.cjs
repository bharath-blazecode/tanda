// Run against the local production build with system Chromium.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = process.env.KACHKA_TEST_ORIGIN;
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const dir = process.argv[2];
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
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--disable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    const cdp = await page.context().newCDPSession(page);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    const feed = page.getByRole('button', { name: 'Feed paper' });
    const model = page.locator('.recorder');
    await feed.click();
    const animations = await model.evaluate(el => el.getAnimations({ subtree: true }).map(a => {
      a.pause(); a.currentTime = 130;
      return a.effect.getTiming().duration;
    }));
    assert(animations.includes(260));
    if (dir) await model.screenshot({ path: path.join(dir, 'mobile-feed-midstroke.png') });
    await model.evaluate(el => el.getAnimations({ subtree: true }).forEach(a => a.finish()));
    await page.waitForFunction(() => document.querySelector('.recorder').getAnimations({ subtree: true }).length === 0);
    assert.equal(await page.getByRole('status').innerText(), 'Tap the squares');
    if (dir) await model.screenshot({ path: path.join(dir, 'mobile-feed-settled.png') });
    await feed.click();
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
    await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    await page.bringToFront();
    assert.equal(await page.getByRole('status').innerText(), 'Read your ticket');
    console.log('PASS midpoint, settled frame and freeze/resume');

    // Repeated clicks in the same turn exercise React event batching and interrupted strokes.
    await feed.evaluate(b => { for (let i = 0; i < 8; i++) b.click(); });
    assert.equal(await page.getByRole('status').innerText(), 'Tap the squares');
    const log = page.getByRole('link', { name: 'Just log a drink' });
    for (let i = 0; i < 6; i++) {
      await feed.click();
      await log.click();
      assert.equal(await page.locator('.recorder').count(), 0);
      await page.goBack();
      assert.equal(await page.getByRole('status').innerText(), 'Stand still');
    }
    const start = page.getByRole('button', { name: 'Start', exact: true });
    await feed.click();
    await start.click();
    await page.waitForURL('**/setup');
    assert.equal(await page.locator('.recorder').count(), 0);
    await page.goBack();
    console.log('PASS rapid advances, interrupted navigation, six return visits and immediate Start');

    // Narrow CSS viewports also exercise reflow under zoom. Force a missing local font.
    await page.route('**/*.woff2', route => route.abort());
    await page.reload();
    for (const width of [640, 320, 280, 390]) {
      await page.setViewportSize({ width, height: 800 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await feed.click();
      const hit = await feed.evaluate(b => {
        const r = b.getBoundingClientRect();
        return r.height >= 44 && b.contains(document.elementFromPoint(r.x+r.width/2, r.y+r.height/2));
      });
      assert(hit);
    }
    console.log('PASS unavailable web fonts, WebGL disabled, resize and 44px hit target');
    assert.deepEqual(errors, []);

    await page.unroute('**/*.woff2');
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const stats = await page.evaluate(async () => {
      const key = document.querySelector('.recorder-key');
      const delta = [];
      let last = await new Promise(requestAnimationFrame);
      for (let i = 0; i < 120; i++) {
        if (i % 20 === 0) key.click();
        const t = await new Promise(requestAnimationFrame);
        delta.push(t-last); last=t;
      }
      delta.sort((a,b) => a-b);
      return { frames: delta.length, p50ms: delta[59], p95ms: delta[113], maxMs: delta.at(-1) };
    });
    await page.waitForTimeout(300);
    assert.equal(await model.evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    console.log('4x Chromium CPU throttle, six manual advances:', JSON.stringify(stats));
    if (process.env.KACHKA_REFERENCE_ORIGIN) await compareAnimatedReceipts(browser, process.env.KACHKA_REFERENCE_ORIGIN);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
