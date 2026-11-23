// Capture both revisions with the same Chromium, synthetic log, clock and local fonts.
// Usage: node scripts/browser-checks/creative.cjs before|after OUTPUT_DIR
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const stage = process.argv[2];
const dir = process.argv[3];
const base = process.env.KACHKA_TEST_ORIGIN;
assert(['before', 'after'].includes(stage) && dir && ['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const now = Date.UTC(2026, 10, 22, 4);
const fixture = {
  v: 2, deviceId: 'aaaaaaaa-0000-4000-8000-0000000000ab', nickname: 'Calm Bilby',
  shareToRoom: false, aiCommentary: false, drinks: [{ id: 'w', kind: 'wine', at: now - 3600000 }],
  lastResult: {
    run: { choice: { medianMs: 2000, wrong: 0, lapses: 8, trials: 8 }, at: now },
    assessment: { verdict: 'tipsy', confidence: 'low', drift: { choiceWrong: 3 }, score: 0,
      nudge: 'ride-or-friend', showSafetyLine: true, partial: true },
    line: 'Logged, with a sigh.', mode: 'demo',
    reference: { kind: 'example', clean: true, run: { choice: { medianMs: 480, wrong: 0, lapses: 0, trials: 8 }, at: 0 } },
  },
};

(async () => {
  await fs.mkdir(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--disable-webgl'] });
  try {
    for (const [device, width, height] of [['mobile', 390, 844], ['desktop', 1280, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, locale: 'en-AU',
        timezoneId: 'Australia/Brisbane', reducedMotion: 'reduce', hasTouch: device === 'mobile' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.clock.setFixedTime(new Date(now));
      await page.goto(base);
      await page.getByLabel('Your name').fill('Calm Bilby');
      await page.getByLabel('Your name').blur();
      await page.evaluate(() => document.fonts.ready);
      const file = name => path.join(dir, stage + '-' + device + '-' + name);
      await page.screenshot({ path: file('landing.png'), fullPage: true });
      if (stage === 'after') {
        const feed = page.getByRole('button', { name: 'Feed paper' });
        const status = page.getByRole('status').filter({ hasText: 'Stand still' });
        await status.waitFor({ state: 'attached' });
        if (device === 'mobile') await feed.tap(); else { await feed.focus(); await feed.press('Space'); }
        await page.getByRole('status').filter({ hasText: 'Tap the squares' }).waitFor();
        await page.screenshot({ path: file('feed.png'), fullPage: true });
        await feed.press('Enter');
        await page.getByRole('status').filter({ hasText: 'Read your ticket' }).waitFor();
        await feed.click();
        await status.waitFor();
        assert.equal(await page.locator('.recorder').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.evaluate(record => localStorage.setItem('bc:v2', JSON.stringify(record)), fixture);
      await page.goto(base + '/result');
      await page.getByRole('button', { name: 'Save receipt' }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const ticket = page.locator('.result-ticket');
      await ticket.screenshot({ path: file('ticket.png') });
      const text = await ticket.innerText();
      assert.match(text, /Not a driving test/);
      assert.match(text, /Logged, with a sigh/);
      assert.match(text, /Simulated/i);
      await fs.writeFile(file('ticket.txt'), text + '\n');
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save receipt' }).click();
      await (await download).saveAs(file('export.png'));
      await page.evaluate(r => {
        r.drinks = [{ id: 'coffee', at: r.lastResult.run.at - 2 * 3600000, kind: 'coffee' }];
        localStorage.setItem('bc:v2', JSON.stringify(r));
      }, fixture);
      await page.goto(base + '/home');
      const chart = page.locator('.k-window').filter({ has: page.locator('svg.k-caffeine') });
      await chart.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await chart.screenshot({ path: file('chart.png') });
      if (stage === 'after') {
        const five = page.getByRole('radio', { name: '5 h', exact: true });
        const originalLine = await chart.locator('polyline').getAttribute('points');
        const band = await chart.locator('polygon').getAttribute('points');
        const originalStore = await page.evaluate(() => localStorage.getItem('bc:v2'));
        assert(await five.isChecked());
        await five.focus();
        await five.press('ArrowRight');
        assert(await page.getByRole('radio', { name: '8 h', exact: true }).isChecked());
        assert.notEqual(await chart.locator('polyline').getAttribute('points'), originalLine);
        assert.equal(await chart.locator('polygon').getAttribute('points'), band);
        assert.match(await chart.innerText(), /eight-hour model/i);
        await chart.screenshot({ path: file('chart-slow.png') });
        await page.getByRole('radio', { name: '2 h', exact: true }).check();
        assert.match(await chart.innerText(), /two-hour model/i);
        assert.equal(await page.evaluate(() => localStorage.getItem('bc:v2')), originalStore);
        await page.reload();
        assert(await five.isChecked());
      }
      if (stage === 'after') {
        for (const artifact of ['ticket.txt', 'ticket.png', 'export.png']) {
          assert((await fs.readFile(file(artifact))).equals(
            await fs.readFile(path.join(dir, 'before-' + device + '-' + artifact))),
            device + ' protected receipt mismatch in ' + artifact);
        }
      }
      assert.deepEqual(errors, []);
      await page.close();
      console.log(stage, device, 'passed');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
