// Drives Kachka flows in headless Chromium. Motion is synthetic (dispatched DeviceMotionEvents),
// the camera is Chromium's fake device. Nothing here is evidence about a physical phone.
const { chromium } = require('playwright');
const BASE = process.env.KACHKA_TEST_ORIGIN || 'http://localhost:3333';
const OUT = process.argv[2];
const only = process.argv[3];
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`); };

async function newPage(browser, { motion = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, permissions: ['camera', 'accelerometer', 'gyroscope'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => check('no page error', false, e.message));
  const requests = [];
  page.on('request', (r) => { if (r.url().includes('/api/')) requests.push({ url: r.url().replace(BASE, ''), method: r.method(), body: r.postData() }); });
  if (motion) {
    await page.addInitScript(() => {
      // Synthetic gyroscope at about 60 Hz: small sway, so Stand Still produces a valid reading.
      let t = 0;
      setInterval(() => {
        t += 1 / 60;
        const e = new DeviceMotionEvent('devicemotion', {
          acceleration: { x: 0.01 * Math.sin(t * 3), y: 0.01 * Math.cos(t * 2), z: 0 },
          accelerationIncludingGravity: { x: 0.1, y: 9.7, z: 0.5 },
          rotationRate: { alpha: 0.1, beta: 0.6 * Math.sin(t * 2.1), gamma: 0.5 * Math.cos(t * 1.3) },
          interval: 16,
        });
        window.dispatchEvent(e);
      }, 16);
    });
  }
  return { ctx, page, requests };
}

async function playChoice(page) {
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  for (let i = 0; i < 10; i++) {
    const lit = page.locator('button[aria-label$=", lit"]');
    await lit.waitFor({ timeout: 5000 });
    await page.waitForTimeout(150);
    await lit.dispatchEvent('pointerdown');
  }
  await page.getByRole('button', { name: 'Next' }).click();
}

async function shot(page, name) { if (OUT) await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); }

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });

  if (!only || only === 'example') {
    // Example route, no motion: quick demo from Landing, one test, pulse, ticket.
    const { page, requests, ctx } = await newPage(browser);
    await page.goto(BASE + '/');
    await page.getByRole('button', { name: /Quick demo/ }).click();
    await page.getByRole('button', { name: 'Continue with one test' }).click();
    await page.getByRole('heading', { name: /What have you had today/ }).waitFor();
    await page.getByRole('button', { name: /^Coffee, 0/ }).click();
    const startKey = page.getByRole('button', { name: /Pick a time first/ });
    check('picker asks for a time before logging', await startKey.isDisabled());
    await page.getByRole('radio', { name: '1 to 3 hours ago' }).check();
    await page.getByRole('button', { name: /Log 1 and start/ }).click();
    await playChoice(page);
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.waitForURL('**/result');
    await page.waitForTimeout(1600);
    const text = await page.locator('body').innerText();
    check('example ticket says Simulated', /Simulated/.test(text));
    check('example ticket says example reference', /Example reference, not your baseline/i.test(text));
    check('example ticket prints the reference line', /Against · example numbers/i.test(text));
    check('pulse row says Skipped on purpose', /Pulse\s*\n?\s*Skipped/.test(text));
    check('standing test shown as skipped', /Stand still\s*\n?\s*Skipped/.test(text));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')));
    check('example run did not create a personal baseline', stored.baseline === undefined);
    check('drink logged with approximate time', stored.drinks.length === 1 && stored.drinks[0].approxTime === true && Date.now() - stored.drinks[0].at > 100 * 60000);
    check('no room post with sharing off', !requests.some((r) => r.url.startsWith('/api/room/')));
    await shot(page, 'flow-example-ticket');
    await page.reload(); await page.waitForTimeout(1600);
    check('reload keeps simulated provenance', /Simulated/.test(await page.locator('body').innerText()));
    await page.goto(BASE + '/home');
    const home = await page.locator('body').innerText();
    check('home offers to record a baseline after an example run', /Record baseline/i.test(home) && /example numbers/i.test(home));
    await shot(page, 'flow-home-after-example');
    await ctx.close();
  }

  if (!only || only === 'personal') {
    // Personal route with synthetic motion: baseline, then a direct check, then recalibration.
    const { page, ctx } = await newPage(browser, { motion: true });
    await page.goto(BASE + '/');
    await page.getByLabel('Your name').fill('Test Wombat');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Allow motion' }).click();
    await page.getByRole('heading', { name: /First, your own normal/ }).waitFor({ timeout: 10000 });
    check('setup hands over to the baseline once motion arrives', page.url().endsWith('/baseline'));
    await page.getByRole('heading', { name: /First, your own normal/ }).waitFor();
    await shot(page, 'flow-baseline-intro');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Nothing yet' }).click();
    // Stand still: start, wait for the 3 s countdown and 10 s capture.
    await page.getByRole('button', { name: /^Start/ }).first().click();
    await page.getByRole('button', { name: 'Use this reading' }).waitFor({ timeout: 25000 });
    await page.getByRole('button', { name: 'Use this reading' }).click();
    await playChoice(page);
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('heading', { name: /That is your baseline/ }).waitFor();
    let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')));
    check('baseline records gyroscope source and capture length', stored.baseline.run.stand.source === 'gyroscope' && stored.baseline.run.stand.captureSeconds === 10);
    check('baseline records the skipped pulse', stored.baseline.run.pulse?.status === 'skipped' && stored.baseline.run.hr === undefined);
    check('baseline starts with zero checks', stored.baseline.checks === 0);
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Run a check' }).click();
    await page.getByRole('heading', { name: /About forty seconds/ }).waitFor();
    const intro = await page.locator('body').innerText();
    check('check intro lists what will be compared', /Stand still\s*\n?\s*compared/i.test(intro) && /Choice tap\s*\n?\s*compared/i.test(intro));
    await shot(page, 'flow-check-intro');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: /^Start/ }).first().click();
    await page.getByRole('button', { name: 'Use this reading' }).waitFor({ timeout: 25000 });
    await page.getByRole('button', { name: 'Use this reading' }).click();
    await playChoice(page);
    await page.waitForURL('**/result');
    await page.waitForTimeout(1600);
    const ticket = await page.locator('body').innerText();
    check('personal ticket compares against your baseline', /Against · your baseline/i.test(ticket));
    check('personal ticket is not simulated', !/Simulated/.test(ticket));
    check('ticket says the pulse step was not taken', /Pulse\s*\n?\s*Not taken/.test(ticket));
    await shot(page, 'flow-personal-ticket');
    stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')));
    check('a real check is counted against the baseline', stored.baseline.checks === 1);
    check('standing comparison carries measurement protocol and placement through storage',
      stored.lastResult.run.stand.protocolVersion === 2 && stored.lastResult.run.stand.placement === 'portrait-up' &&
      typeof stored.lastResult.assessment.drift.sway === 'number');
    const firstBaselineAt = stored.baseline.run.at;
    // Recalibrate with alcohol logged: blocked.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bc:v2')); s.drinks.push({ id: 'b1', kind: 'beer', at: Date.now() - 60000 }); localStorage.setItem('bc:v2', JSON.stringify(s)); });
    await page.goto(BASE + '/home');
    check('home shows the safety line with one beer', /Not a driving test/.test(await page.locator('body').innerText()));
    await page.getByRole('button', { name: 'Recalibrate' }).click();
    await page.getByRole('heading', { name: /Not with alcohol/i }).waitFor();
    check('recalibration is blocked with alcohol logged today', /Not with alcohol logged today/i.test(await page.locator('body').innerText()));
    await shot(page, 'flow-recalibrate-blocked');
    // Result ticket keeps its own reference after recalibration: simulate a new baseline directly.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bc:v2')); s.drinks = []; s.baseline = { ...s.baseline, run: { ...s.baseline.run, at: Date.now(), stand: { ...s.baseline.run.stand, swayRms: s.baseline.run.stand.swayRms * 3 } } }; localStorage.setItem('bc:v2', JSON.stringify(s)); });
    await page.goto(BASE + '/result'); await page.getByText(/Against · your baseline/).first().waitFor();
    check('old ticket still prints its original reference', /Against · your baseline/i.test(await page.locator('body').innerText()));
    stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')));
    check('stored ticket reference unchanged by recalibration', stored.lastResult.reference.run.at === firstBaselineAt);
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('bc:v2'));
      delete data.baseline.run.stand.protocolVersion;
      localStorage.setItem('bc:v2', JSON.stringify(data));
    });
    await page.goto(BASE + '/check');
    await page.getByText(/Record a new baseline to compare standing/).waitFor();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByText(/Test 2 of 2 · Choice tap/).first().waitFor();
    check('a historical standing baseline proceeds directly to comparable taps', true);
    await ctx.close();
  }

  if (!only || only === 'reduced') {
    // Reduced route: a standing-only baseline on a browser with no motion now.
    const { page, ctx, requests } = await newPage(browser);
    await page.goto(BASE + '/');
    await page.evaluate(() => {
      const s = { v: 2, deviceId: 'aaaaaaaa-0000-4000-8000-000000000009', nickname: 'Calm Emu', shareToRoom: false, aiCommentary: true, drinks: [],
        baseline: { run: { stand: { swayRms: 0.6, swayLateralRms: 0.3, hz: 60, valid: true, source: 'gyroscope', captureSeconds: 10 }, at: Date.now() - 3600000 }, clean: true, checks: 2 } };
      localStorage.setItem('bc:v2', JSON.stringify(s));
    });
    await page.goto(BASE + '/setup');
    await page.getByRole('button', { name: 'Continue with one test' }).click();
    // Stay in the same session (client-side navigation), so the app still knows motion is unavailable.
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Run a check' }).click();
    await page.getByRole('heading', { name: /Nothing to compare here/i }).waitFor({ timeout: 5000 }).catch(() => {});
    const intro = await page.locator('body').innerText();
    check('reduced: warns before starting that nothing can be compared', /Nothing to compare here/i.test(intro));
    await shot(page, 'flow-reduced-nothing');
    check('reduced: no verdict request made', !requests.some((r) => r.url === '/api/verdict'));
    // After a reload the app forgets the sensor is missing; Stand Still finds out and the run ends honestly.
    await page.goto(BASE + '/check');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: /^Start/ }).first().click();
    await page.getByRole('heading', { name: /No reading this time/i }).waitFor({ timeout: 8000 }).catch(() => {});
    const after = await page.locator('body').innerText();
    check('reduced after reload: no tapping test asked for, no ticket printed', /No reading this time/i.test(after) && !page.url().endsWith('/result'));
    await shot(page, 'flow-reduced-no-reading');
    await ctx.close();
  }

  if (!only || only === 'migration') {
    // A v1 record from the hackathon build: migrates, keeps the log, turns sharing off.
    const { page, ctx } = await newPage(browser);
    await page.goto(BASE + '/');
    await page.evaluate(() => {
      const now = Date.now();
      localStorage.clear();
      localStorage.setItem('bc:v1', JSON.stringify({ v: 1, deviceId: '11111111-2222-3333-4444-555555555555', nickname: 'Old Galah', shareToRoom: true,
        baseline: { run: { stand: { swayRms: 0.6, swayLateralRms: 0.4, hz: 60, valid: true }, choice: { medianMs: 480, wrong: 0, lapses: 0, trials: 8 }, at: now - 7200000 }, clean: true },
        drinks: [{ kind: 'coffee', at: now - 3600000 }, { kind: 'beer', at: now - 600000 }] }));
    });
    await page.goto(BASE + '/home');
    const v1 = await page.evaluate(() => localStorage.getItem('bc:v1'));
    const v2 = await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')));
    check('migration writes v2 and keeps v1', v2 && v2.v === 2 && v1 !== null);
    check('migration turns sharing off', v2.shareToRoom === false);
    check('migration keeps the personal baseline and both drinks', !!v2.baseline && v2.drinks.length === 2);
    await shot(page, 'flow-home-migrated');
    await ctx.close();
  }

  if (!only || only === 'privacy') {
    const board = async (page) => page.evaluate(() => fetch('/api/room').then((r) => r.json()));
    // 1. Sharing on from Landing, commentary off: presence and result reach the board, no verdict request.
    const { page, ctx, requests } = await newPage(browser);
    await page.goto(BASE + '/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const toggle = page.getByRole('checkbox', { name: 'Show me on the room screen' });
    check('landing: room sharing starts off', !(await toggle.isChecked()));
    await shot(page, 'flow-landing-first-visit');
    await toggle.check();
    await page.getByLabel('Your name').fill('Privacy Pelican');
    await page.getByRole('button', { name: /Quick demo/ }).click();
    await page.getByRole('button', { name: 'Continue with one test' }).click();
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('bc:v2')); s.aiCommentary = false; localStorage.setItem('bc:v2', JSON.stringify(s)); });
    await page.getByRole('button', { name: 'Nothing today' }).click();
    await playChoice(page);
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.waitForURL('**/result');
    await page.waitForTimeout(1500);
    check('sharing on: presence was sent', requests.some((r) => r.url === '/api/room/presence'));
    check('sharing on: the result was posted as simulated', requests.some((r) => r.url === '/api/room/result' && JSON.parse(r.body).mode === 'demo' && !('handicap' in JSON.parse(r.body))));
    check('commentary off: no verdict request', !requests.some((r) => r.url === '/api/verdict'));
    let state = await board(page);
    check('board shows the entry', state.feed.some((e) => e.nickname === 'Privacy Pelican'));
    // Receipt fields: name off by default in the preview.
    await page.getByText('What the image will say').click();
    const preview = await page.locator('.result-preview-text').innerText();
    check('receipt preview leaves the name off by default', !/Privacy Pelican/i.test(preview) && /Simulated/i.test(preview));
    await page.getByRole('checkbox', { name: 'Include my name' }).check();
    check('receipt preview adds the name when chosen', /Privacy Pelican/i.test(await page.locator('.result-preview-text').innerText()));
    await shot(page, 'flow-receipt-fields');
    // 2. Turn sharing off in Privacy: withdraw request, entry gone.
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: /Privacy · room screen/ }).click();
    await shot(page, 'flow-privacy');
    // Keep the old opted-in record readable while writes and removals fail.
    await page.evaluate(() => {
      Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
      Storage.prototype.removeItem = () => { throw new DOMException('Denied', 'SecurityError'); };
    });
    await page.route('**/api/room/withdraw', route => route.fulfill({ status: 503 }), { times: 1 });
    await page.getByRole('checkbox', { name: 'Show me on the room screen' }).uncheck();
    await page.getByRole('button', { name: 'Retry room removal' }).click();
    check('an unconfirmed withdrawal can be retried with sharing off', !(await toggle.isChecked()));
    await page.getByText('Removed from the room screen.').waitFor({ timeout: 5000 });
    check('turning sharing off sends a withdrawal', requests.some((r) => r.url === '/api/room/withdraw'));
    state = await board(page);
    check('board no longer shows the entry', !state.feed.some((e) => e.nickname === 'Privacy Pelican'));
    const presenceBefore = requests.filter((r) => r.url === '/api/room/presence').length;
    await page.waitForTimeout(16000);
    check('no heartbeat after sharing is off', requests.filter((r) => r.url === '/api/room/presence').length === presenceBefore);
    const reports = () => requests.filter(r => ['/api/room/presence', '/api/room/result'].includes(r.url)).length;
    const beforeReload = reports();
    check('failure fixture retains a stale disk opt-in', await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')).shareToRoom === true));
    await page.goto(BASE + '/result');
    await page.getByText('What the image will say').waitFor();
    await page.goto(BASE + '/privacy');
    check('reload with stale consent suppresses presence and result', reports() === beforeReload && !(await toggle.isChecked()));
    // 3. Share again, then Start over from Landing: withdraw first, then local data gone.
    await page.getByRole('checkbox', { name: 'Show me on the room screen' }).check();
    const other = await ctx.newPage();
    await other.goto(BASE + '/privacy');
    await other.evaluate(() => {
      Storage.prototype.removeItem = () => { throw new DOMException('Denied', 'SecurityError'); };
      Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError'); };
    });
    await other.getByRole('button', { name: 'Delete everything on this phone' }).click();
    await other.getByRole('button', { name: 'Delete everything' }).click();
    await other.getByText(/Browser storage could not be cleared/).waitFor();
    await page.waitForFunction(() => !document.querySelector('input[type=checkbox]').checked);
    check('open tab honors withdrawal even when the other tab cannot update storage', !(await toggle.isChecked()));
    await other.close();
    await page.goto(BASE + '/');
    await page.getByRole('button', { name: 'Start over' }).click();
    await page.getByRole('button', { name: 'Delete everything' }).click();
    await page.getByText(/Deleted from this phone/).waitFor({ timeout: 8000 });
    const withdrawals = requests.filter((r) => r.url === '/api/room/withdraw').length;
    check('start over withdraws from the room first', withdrawals >= 2);
    const after = await page.evaluate(() => [JSON.parse(localStorage.getItem('bc:v2')), localStorage.getItem('bc:v1')]);
    check('start over clears the log, baseline and ticket', after[0].drinks.length === 0 && !after[0].lastResult && !after[0].baseline && after[1] === null);
    await shot(page, 'flow-after-start-over');
    await ctx.close();
  }

  if (!only || only === 'caffeine') {
    const { page, ctx } = await newPage(browser);
    await page.goto(BASE + '/');
    const fixtureNow = await page.evaluate(() => new Date(2026, 10, 22, 12).getTime());
    await page.clock.setFixedTime(fixtureNow);
    // A record with a coffee from last night (before 4am) and a migrated v1 beer.
    await page.evaluate(() => {
      const now = new Date();
      const lastNight = new Date(now); lastNight.setHours(4, 0, 0, 0); if (lastNight.getTime() > now.getTime()) lastNight.setDate(lastNight.getDate() - 1);
      const s = { v: 2, deviceId: 'aaaaaaaa-0000-4000-8000-00000000c0ff', nickname: 'Calm Bilby', shareToRoom: false, aiCommentary: true,
        drinks: [ { id: 'night', kind: 'coffee', at: lastNight.getTime() - 3 * 3600000, caffeine: { basis: 'serving', mg: 100, source: 'default' } },
                  { id: 'v1-1-0', kind: 'beer', at: Date.now() - 20 * 60000, legacy: true } ] };
      localStorage.setItem('bc:v2', JSON.stringify(s));
    });
    await page.goto(BASE + '/home');
    let home = await page.locator('body').innerText();
    check('carry-over: last night\'s coffee is in the estimate', /From before 4am/i.test(home) && /Before 4am, still in the caffeine estimate/i.test(home));
    check('legacy beer shows as a count, not standard drinks', /count only/i.test(home) && /No label detail, so no standard-drink count/i.test(home));
    check('safety line shown with a beer logged', /Not a driving test/.test(home));
    await shot(page, 'flow-home-carryover');

    // Add an energy drink with label detail, two hours ago.
    await page.getByRole('button', { name: 'Log a drink' }).click();
    await page.getByRole('button', { name: 'Add with details' }).click();
    await page.getByRole('radio', { name: 'Energy drink' }).check();
    const twoHoursAgo = await page.evaluate(() => { const d = new Date(Date.now() - 2 * 3600000); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; });
    await page.getByLabel('When you had it').fill(twoHoursAgo);
    await page.getByLabel('Serving size (optional)').fill('250');
    await page.getByRole('radio', { name: 'mg per 100 mL' }).check();
    await page.getByLabel('Caffeine per 100 mL').fill('32');
    await page.getByRole('radio', { name: 'The label' }).first().check();
    const preview = await page.locator('[role=status]').first().innerText();
    check('editor shows the label arithmetic live', /32 mg per 100 mL × 250 mL = 80 mg \(from the label\)/.test(preview), preview);
    await shot(page, 'flow-editor-energy');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/home');
    home = await page.locator('body').innerText();
    check('home lists the energy drink at its real time with 80 mg', /Energy drink[\s\S]*80 mg/.test(home));
    let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')));
    const energy = stored.drinks.find((d) => d.kind === 'energy');
    check('stored with consumption time two hours back and logging time now', energy && fixtureNow - energy.at === 120 * 60000 && energy.loggedAt === fixtureNow);

    // Edit it: half drunk, then undo the edit.
    await page.getByRole('button', { name: /^Edit Energy drink/ }).click();
    await page.getByRole('radio', { name: 'Half' }).check();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/home');
    check('edited entry shows 40 mg', /40 mg/.test(await page.locator('body').innerText()));
    await page.getByRole('button', { name: 'Undo the edit' }).click();
    await page.getByText('Edit undone.').waitFor();
    check('undo restores 80 mg', /80 mg/.test(await page.locator('body').innerText()));

    // Beer with label strength: 1.3 standard drinks.
    await page.getByRole('button', { name: 'Log a drink' }).click();
    await page.getByRole('button', { name: 'Add with details' }).click();
    await page.getByRole('radio', { name: 'Beer' }).check();
    await page.getByLabel('Serving size (optional)').fill('375');
    await page.getByLabel('Strength').fill('4.5');
    check('editor shows the standard-drink arithmetic', /375 mL × 4\.5% × about 0\.789 g\/mL = 13\.3 g of alcohol, ÷ 10 g = 1\.3 Australian standard drinks/.test(await page.locator('[role=status]').first().innerText()));
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText(/Alcohol today: 2 entries/).waitFor({ timeout: 5000 }).catch(() => {});
    home = await page.locator('body').innerText();
    check('home totals give standard drinks only for the detailed entry', /About 1\.3 Australian standard drinks from the 1 with label detail; 1 without/.test(home));

    // One-tap tea: unknown amount, said so.
    await page.getByRole('button', { name: 'Log a drink' }).click();
    await page.getByRole('button', { name: 'Tea', exact: true }).click();
    await page.getByText('mg unknown').waitFor({ timeout: 5000 }).catch(() => {});
    home = await page.locator('body').innerText();
    check('tea logs with an unknown amount and the estimate says it reads low', /mg unknown/.test(home) && /left out, so this reads low/.test(home));

    // Remove the tea, then undo the removal.
    await page.getByRole('button', { name: /^Undo that drink/ }).waitFor();
    await page.getByRole('button', { name: /^Edit Tea/ }).click();
    await page.getByRole('button', { name: 'Remove this drink' }).click();
    await page.waitForURL('**/home');
    check('removed tea is gone', !/^Tea$/m.test(await page.locator('.k-entries').first().innerText()));
    await page.getByRole('button', { name: 'Undo the removal' }).click();
    await page.getByText('Drink put back.').waitFor();
    check('undo puts the tea back', /Tea/.test(await page.locator('.k-entries').first().innerText()));

    // A future time is refused with a reason.
    await page.getByRole('button', { name: 'Log a drink' }).click();
    await page.getByRole('button', { name: 'Add with details' }).click();
    const later = await page.evaluate(() => { const d = new Date(Date.now() + 3 * 3600000); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; });
    await page.getByLabel('When you had it').fill(later);
    await page.getByRole('button', { name: 'Save' }).click();
    check('a future time is refused with a reason', /That is in the future/.test(await page.locator('body').innerText()) && page.url().endsWith('/log'));
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Back' }).click();

    // Bedtime.
    await page.getByRole('button', { name: 'Change' }).click();
    await page.getByLabel('Your bedtime').fill('22:30');
    await page.getByRole('button', { name: 'Save bedtime' }).click();
    stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')));
    check('bedtime saved as minutes after midnight', stored.bedtimeMinutes === 22 * 60 + 30);
    check('estimate rows use the chosen bedtime', /At 22:30/.test(await page.locator('body').innerText()));
    await shot(page, 'flow-home-caffeine');
    await ctx.close();
  }

  if (!only || only === 'lapses') {
    // A baseline tapping run with no correct taps is never saved as a placeholder.
    const missAll = async (page) => {
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await page.getByRole('button', { name: 'Next' }).waitFor({ timeout: 40000 }); // every square lapses after 2 s
      await page.getByRole('button', { name: 'Next' }).click();
    };
    const { page, ctx } = await newPage(browser);
    await page.goto(BASE + '/'); await page.evaluate(() => localStorage.clear());
    await page.goto(BASE + '/setup');
    await page.getByRole('button', { name: 'Continue with one test' }).click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Nothing yet' }).click();
    await missAll(page);
    check('no-motion baseline with no correct taps asks again instead of saving', /nothing to keep yet/i.test(await page.locator('body').innerText()));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bc:v2')));
    check('nothing was saved as a baseline', stored.baseline === undefined);
    await ctx.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR', e.message); process.exit(2); });
