// Local production build only. The projector fixture contains invented participants.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const [stage, dir] = process.argv.slice(2);
const base = process.env.KACHKA_TEST_ORIGIN;
assert(['before','after'].includes(stage) && ['localhost','127.0.0.1'].includes(new URL(base).hostname));
const feed = [
  { nickname: 'Calm Bilby', mode: 'demo', verdict: 'wobbly', score: 35, at: 200 },
  { nickname: 'Quiet Heron', mode: 'real', verdict: 'steady', score: 86, at: 100 },
];
const room = { total: 2, updatedAt: 201, feed, mix: { steady: 1, wired: 0, tipsy: 0, wobbly: 1 },
  top: { real: [feed[1]], demo: [feed[0]] }, liveCount: 2,
  live: feed.map((e,i) => ({ nickname: e.nickname, at: e.at, stage: i ? 'stand' : 'demo' })) };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
  try {
    await fs.mkdir(dir, { recursive: true });
    for (const [device, width, height] of [['mobile',390,844],['desktop',1280,900]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const writes = [];
      page.on('request', r => { if (r.method() === 'POST') writes.push(new URL(r.url()).pathname); });
      let online = true;
      await page.route('**/api/room', r => online ? r.fulfill({ json: room }) : r.abort());
      await page.goto(base + '/room');
      await page.getByText('Quiet Heron').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const shot = name => page.screenshot({ path: path.join(dir, stage+'-'+device+'-'+name+'.png'), fullPage: true });
      await shot('room');
      if (stage === 'after') {
        assert(!/steadiest|dizziest/i.test(await page.locator('body').innerText()));
        assert(await page.getByText('Simulated', { exact: true }).isVisible());
        online = false;
        await page.getByText(/Room updates paused/).waitFor();
        assert.equal(await page.getByText('Calm Bilby').count(), 0);
        online = true;
        await page.getByText('Calm Bilby').first().waitFor();
      }
      assert.deepEqual(writes, []);
      await page.goto(base + '/privacy');
      await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('bc:v2')); r.nickname = 'Calm Bilby'; localStorage.setItem('bc:v2', JSON.stringify(r)); });
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await shot('privacy');
      if (stage === 'after') {
        const handle = await page.evaluate(() => {
          const record = JSON.parse(localStorage.getItem('bc:v2'));
          const at = Date.now();
          record.drinks = [{ id: 'sample', at, kind: 'wine' }];
          const choice = { medianMs: 480, wrong: 0, lapses: 0, trials: 8 };
          record.lastResult = { run: { at, choice }, mode: 'demo', line: 'Sample ticket',
            assessment: { verdict: 'steady', confidence: 'low', drift: {}, score: 72, nudge: 'carry-on', showSafetyLine: true, partial: true },
            reference: { kind: 'example', clean: true, run: { at: 0, choice } } };
          localStorage.setItem('bc:v2', JSON.stringify(record));
          return record.deviceId;
        });
        await page.reload();
        const toggle = page.getByRole('checkbox', { name: 'Show me on the room screen' });
        await toggle.check();
        const share = page.getByRole('button', { name: 'Share this ticket to the room' });
        await share.waitFor();
        await shot('ticket-choice');
        // A same-document change emits no storage event. Require review before sending.
        await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('bc:v2')); r.lastResult.assessment.score = 65; localStorage.setItem('bc:v2', JSON.stringify(r)); });
        await share.click();
        await page.getByText(/Review the current details/).waitFor();
        assert(!writes.includes('/api/room/result'));
        await page.route('**/api/room/result', r => r.abort(), { times: 1 });
        await share.focus();
        await share.press('Enter');
        await page.getByText(/Ticket sharing was not confirmed/).waitFor();
        await share.click();
        await page.getByText(/Ticket request sent/).waitFor();
        const liveBoard = async () => (await page.request.get(base+'/api/room')).json();
        assert((await liveBoard()).feed.some(e => e.nickname === 'Calm Bilby' && e.score === 65));
        await page.route('**/api/room/withdraw', r => r.fulfill({ status: 503 }), { times: 1 });
        await page.getByRole('button', { name: 'Delete everything on this phone' }).click();
        await page.getByRole('button', { name: 'Delete everything', exact: true }).click();
        await page.getByRole('link', { name: 'retry room removal' }).waitFor();
        await page.reload();
        const scrubbed = await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')));
        assert(scrubbed.deviceId === handle && scrubbed.roomRemovalPending && !scrubbed.shareToRoom);
        assert(!scrubbed.lastResult && !scrubbed.drinks.length);
        await page.goto(base + '/privacy');
        assert(await toggle.isDisabled());
        await page.getByRole('button', { name: 'Remove any previous room entry' }).click();
        await page.getByText('Removed from the room screen.').waitFor();
        assert(await page.evaluate(id => JSON.parse(localStorage.getItem('bc:v2')).deviceId !== id, handle));
        assert(!(await liveBoard()).feed.some(e => e.nickname === 'Calm Bilby' && e.score === 65));
        assert(!(await toggle.isChecked()));
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.close();
      console.log(stage, device, 'passed');
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
