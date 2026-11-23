const { chromium } = require('playwright');
const BASE = process.env.KACHKA_TEST_ORIGIN || 'http://localhost:3333';
const results = []; const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const violations = [];
  async function newContext(options) {
    const ctx = await b.newContext(options);
    await ctx.exposeBinding('recordCspViolation', (_source, directive) => violations.push(directive));
    await ctx.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', event => window.recordCspViolation([location.pathname, event.effectiveDirective, event.blockedURI, event.sourceFile, event.lineNumber, event.columnNumber].join(' ')));
    });
    return ctx;
  }
  // 1. Routes load without page errors.
  {
    const ctx = await newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    const errors = []; p.on('pageerror', (e) => errors.push(e.message));
    const response = await p.goto(BASE + '/');
    check('production document enforces script policy', response.headers()['content-security-policy']?.includes("script-src 'self'"));
    await p.evaluate(() => localStorage.setItem('bc:v2', JSON.stringify({ v: 2, deviceId: 'aaaaaaaa-0000-4000-8000-0000000000aa', nickname: 'Calm Galah', shareToRoom: false, aiCommentary: true, drinks: [],
      baseline: { run: { stand: { swayRms: 0.6, swayLateralRms: 0.3, hz: 60, valid: true, source: 'gyroscope', captureSeconds: 10 }, choice: { medianMs: 480, wrong: 0, lapses: 0, trials: 8 }, at: Date.now() - 3600000 }, clean: true, checks: 0 } })));
    for (const path of ['/lab', '/lab/care', '/lab/kit', '/result?preview', '/room', '/demo', '/privacy', '/log', '/home', '/baseline', '/check', '/nope']) {
      await p.goto(BASE + path); await p.waitForTimeout(400);
    }
    check('every route loads without a page error', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  // 2. No horizontal overflow at 320 px on the busiest screens.
  {
    const ctx = await newContext({ viewport: { width: 320, height: 640 } }); const p = await ctx.newPage();
    await p.goto(BASE + '/');
    await p.evaluate(() => { const now = Date.now(); localStorage.setItem('bc:v2', JSON.stringify({ v: 2, deviceId: 'aaaaaaaa-0000-4000-8000-0000000000ab', nickname: 'Wobbly Cassowary', shareToRoom: false, aiCommentary: true,
      drinks: [ { id: 'e', kind: 'energy', at: now - 3600000, servingMl: 500, fraction: 0.5, name: 'Sugar free can, large', caffeine: { basis: 'per100ml', mgPer100ml: 32, source: 'label' } }, { id: 'w', kind: 'wine', at: now - 600000, servingMl: 150, alcohol: { abv: 13.5, source: 'label' } } ],
      lastResult: { run: { choice: { medianMs: 2000, wrong: 0, lapses: 8, trials: 8 }, pulse: { status: 'approximate', bpm: 91 }, at: now - 60000 }, assessment: { verdict: 'tipsy', confidence: 'low', drift: { choiceWrong: 3 }, score: 0, nudge: 'ride-or-friend', showSafetyLine: true, partial: true }, line: 'Logged, with a sigh.', mode: 'demo',
        reference: { kind: 'example', run: { stand: { swayRms: 0.6, swayLateralRms: 0.4, hz: 60, valid: true, source: 'gyroscope' }, choice: { medianMs: 480, wrong: 0, lapses: 0, trials: 8 }, at: 0 }, clean: true } } })); });
    for (const path of ['/home', '/result', '/privacy', '/log']) {
      await p.goto(BASE + path); await p.waitForTimeout(1800);
      if (path === '/log') await p.getByRole('button', { name: 'Add with details' }).click();
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`no horizontal scroll at 320 px on ${path}`, over <= 0, `overflow ${over}px`);
    }
    await p.goto(BASE + '/result'); await p.waitForTimeout(1800);
    const t = await p.locator('body').innerText();
    check('tipsy example ticket at 320 px keeps the safety line, provenance and the approximate pulse', /Not a driving test/.test(t) && /Simulated/.test(t) && /about 91 bpm/.test(t) && /No clean taps/i.test(t));
    if (process.argv[2]) await p.screenshot({ path: `${process.argv[2]}/after-narrow-ticket.png`, fullPage: true });
    const appearance = await p.evaluate(async () => {
      await document.fonts.ready;
      const stamp = document.querySelector('.k-stamp');
      const fontLoaded = family => [...document.fonts].some(font => font.family.includes(family) && font.status === 'loaded');
      return !!stamp && getComputedStyle(stamp).filter.includes('#k-ink') && !!document.querySelector('filter#k-ink') &&
        fontLoaded('Big Shoulders Display') && fontLoaded('Courier Prime');
    });
    check('receipt stamp resolves its SVG filter and both local font families load', appearance);
    const downloadPromise = p.waitForEvent('download');
    await p.getByRole('button', { name: 'Save receipt' }).click();
    const download = await downloadPromise;
    const bytes = require('node:fs').readFileSync(await download.path());
    check('saved receipt is a PNG image', bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a');
    await ctx.close();
  }
  // 3. Keyboard only: log a coffee with details.
  {
    const ctx = await newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    await p.goto(BASE + '/log');
    await p.getByRole('button', { name: 'Add with details' }).focus(); await p.keyboard.press('Enter');
    await p.getByRole('radio', { name: 'Coffee' }).focus();
    await p.keyboard.press('ArrowRight'); // radio group: arrow keys move the choice
    const tea = await p.getByRole('radio', { name: 'Tea' }).isChecked();
    check('kind choice moves with arrow keys (native radio group)', tea);
    await p.getByLabel('Product or how it was made (optional)').focus(); await p.keyboard.type('Green, loose leaf');
    await p.getByRole('radio', { name: 'mg in the serving' }).focus(); await p.keyboard.press('Space');
    await p.getByLabel('Caffeine in the serving').focus(); await p.keyboard.type('30');
    await p.getByRole('button', { name: 'Save' }).focus(); await p.keyboard.press('Enter');
    await p.waitForURL('**/home'); await p.getByText('Green, loose leaf').first().waitFor({ timeout: 5000 });
    check('keyboard alone can add a tea with its amount', /Green, loose leaf/.test(await p.locator('body').innerText()) && /30 mg/.test(await p.locator('body').innerText()));
    const focusVisible = await p.evaluate(() => getComputedStyle(document.querySelector('.k-entry')).cursor === 'pointer');
    check('entries are buttons (focusable, keyboard operable)', focusVisible && (await p.locator('button.k-entry').count()) > 0);
    await ctx.close();
  }
  // At 05:00, a drink from two hours ago belongs to the collapsed previous-day group.
  {
    const ctx = await newContext({ timezoneId: 'Australia/Brisbane' });
    const p = await ctx.newPage();
    const now = new Date('2026-11-22T05:00:00+10:00');
    await p.clock.setFixedTime(now);
    await p.goto(BASE);
    await p.evaluate(() => {
      const record = JSON.parse(localStorage.getItem('bc:v2'));
      record.drinks = [{ id: 'early-energy', kind: 'energy', at: Date.now() - 7200000,
        caffeine: { basis: 'serving', mg: 80, source: 'label' } }];
      localStorage.setItem('bc:v2', JSON.stringify(record));
    });
    await p.goto(BASE + '/home');
    const edit = p.getByRole('button', { name: /^Edit Energy drink/ });
    check('previous-day entry starts collapsed at 05:00', await edit.count() === 0);
    await p.locator('summary').filter({ hasText: 'Before 4am' }).click();
    await edit.click();
    check('previous-day entry can be edited after expanding', await p.getByRole('button', { name: 'Remove this drink' }).isVisible());
    await ctx.close();
  }
  // Some browsers deny access to the localStorage getter itself.
  {
    const ctx = await newContext();
    await ctx.addInitScript(() => Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('Blocked', 'SecurityError'); },
    }));
    const p = await ctx.newPage();
    const posts = [];
    p.on('request', req => {
      if (/\/api\/room\/(presence|result)$/.test(req.url())) posts.push(req.url());
    });
    await p.goto(BASE + '/privacy');
    await p.getByRole('checkbox', { name: 'Show me on the room screen' }).click();
    await p.getByText('Sharing is off. Browser storage is unavailable.').waitFor();
    await p.reload();
    const toggle = p.getByRole('checkbox', { name: 'Show me on the room screen' });
    await toggle.waitFor();
    check('blocked storage getter leaves sharing off across reload', !(await toggle.isChecked()) && posts.length === 0);
    await ctx.close();
  }
  // 4. Reduced motion: the ticket does not animate.
  {
    const ctx = await newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.goto(BASE + '/result?preview'); await p.waitForTimeout(300);
    const anim = await p.evaluate(() => { const el = document.querySelector('.k-ticket--print'); return el ? getComputedStyle(el).animationName : 'missing'; });
    check('reduced motion: ticket print animation is off', anim === 'none', anim);
    await ctx.close();
  }
  check('normal browser flows have no CSP violations', violations.length === 0, [...new Set(violations)].join(', '));
  await b.close();
  if (!results.every(Boolean)) process.exitCode = 1;
  console.log(`${results.filter(Boolean).length}/${results.length} extra checks passed`);
})().catch((e) => { console.error('SCRIPT ERROR', e.message); process.exit(2); });
