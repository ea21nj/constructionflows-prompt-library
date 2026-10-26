import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const OPENING = 'Walk the site and talk to the crew — each one is an AI agent that could help your business. After you\'ve met 3, head to the site office for your results. Prefer the classic pages? Use the menu.';

// Software WebGL in CI is slow: the low tier keeps game time close to real time.
async function openGame(page, path = '/?test=1&tier=low') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
  await page.goto(path);
  await page.waitForFunction(() => window.__siteWalk && window.__siteWalk.isReady && window.__siteWalk.isReady(), null, { timeout: 90_000 });
  return errors;
}

test.describe('shell', () => {
  test('shows loading then the opening card with the exact copy', async ({ page, request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('sw-loading');                       // the loading screen is in the first paint
    await openGame(page);
    await expect(page.locator('.sw-loading')).toBeHidden();
    await expect(page.locator('.sw-opening p.sw-opening-lede')).toHaveText(OPENING);
    await expect(page.getByRole('button', { name: 'Start walking' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip to the agents' })).toBeVisible();
  });

  test('Start walking hides the card and shows the canvas', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await expect(page.locator('.sw-opening')).toBeHidden();
    await expect(page.locator('#siteWalk canvas.sw-canvas')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeHidden();
  });

  test('Skip to the agents opens the 10 agents page', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Skip to the agents' }).click();
    await expect(page.locator('#face-agents')).toBeVisible();
    await expect(page.locator('.agent-card').first()).toBeVisible();
    await expect(page.locator('#siteWalk')).toBeHidden();
  });

  test('menu reaches every classic page and back', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    for (const [item, face] of [['Agent quiz', 'quiz'], ['10 agents', 'agents'], ['Discovery interview', 'discovery'], ['About', 'about']]) {
      await page.locator('.sw-menu-btn').click();
      await page.locator('.sw-menu-panel').getByRole('button', { name: item }).click();
      await expect(page.locator(`#face-${face}`)).toBeVisible();
      await page.locator('[data-site-walk]').click();                 // nav link back to the game
      await expect(page.locator('#siteWalk canvas.sw-canvas')).toBeVisible();
    }
  });

  test('deep link skips game', async ({ page }) => {
    await page.goto('/#agents');
    await expect(page.locator('.agent-card').first()).toBeVisible();
    await expect(page.locator('#siteWalk')).toBeHidden();
  });

  test('no WebGL falls back to classic pages with the note', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : orig.call(this, type, ...rest); };
    });
    await page.goto('/');
    await expect(page.getByText('Your browser can\'t run the 3D site, so here are the classic pages.')).toBeVisible();
    await expect(page.locator('.agent-card').first()).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors = await openGame(page);
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  test('classic pages still work', async ({ page }) => {
    await page.goto('/#agents');
    await page.locator('.agent-card').first().click();
    await expect(page.locator('#agentDialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[data-face="discovery"]').click();
    await page.locator('[data-open-area="0"]').click();
    await expect(page.locator('.dv-q')).toBeVisible();
    await page.locator('[data-face="quiz"]').click();
    await expect(page.locator('#face-quiz')).toBeVisible();
  });
});

const AREA_CENTRES = { office: [-42, 20], building: [-35, -10], excavation: [30, -18], laydown: [55, 20], parking: [27, 24], gate: [-1.5, 34] };
const completeThree = () => {
  const s = { v: 1, answers: { 1: [2, 2, 2], 3: [1, 1, 1], 5: [3, 3, 3] }, lastTalked: { 1: 1, 3: 2, 5: 3 }, officeSeen: false };
  localStorage.setItem('wp.sitewalk.v1', JSON.stringify(s));
};

test.describe('world', () => {
  test('site renders every area', async ({ page }) => {
    const errors = await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    for (const [id, [x, z]] of Object.entries(AREA_CENTRES)) {
      await page.evaluate(([x, z]) => window.__siteWalk.teleport(x, z), [x, z]);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `test-results/areas/${id}.png` });
    }
    // Whole-site overview for review.
    await page.evaluate(() => { const { camera, controls } = window.__siteWalk.game.engine; controls.maxDistance = 200; controls.target.set(0, 0, 0); camera.position.set(-70, 110, 120); });
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'test-results/areas/overview.png' });
    expect(errors).toEqual([]);
    const meshes = await page.evaluate(() => { let n = 0; window.__siteWalk.game.world.root.traverse((o) => { if (o.isMesh) n++; }); return n; });
    expect(meshes).toBeGreaterThan(300);
  });

  test('office marker hidden until open', async ({ page }) => {
    await openGame(page);
    expect(await page.evaluate(() => window.__siteWalk.game.world.officeMarker.visible)).toBe(false);
    await page.evaluate(completeThree);
    await page.reload();
    await page.waitForFunction(() => window.__siteWalk?.isReady());
    expect(await page.evaluate(() => window.__siteWalk.game.world.officeMarker.visible)).toBe(true);
  });
});

test.describe('crew', () => {
  test('ten crew are on site', async ({ page }) => {
    await openGame(page);
    const crew = await page.evaluate(() => window.__siteWalk.crewPositions());
    expect(crew).toHaveLength(10);
  });

  test('crew move over time', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    // Wait on game time, not wall time: software WebGL in CI renders only a few frames a second.
    const before = await page.evaluate(() => window.__siteWalk.crewPositions());
    await page.waitForFunction((before) => {
      const now = window.__siteWalk.crewPositions();
      return now.filter((n, i) => Math.hypot(n.x - before[i].x, n.z - before[i].z) > 0.3).length >= 3;
    }, before, { timeout: 90_000 });
    // Close-ups for review.
    for (const id of [1, 5, 10]) {
      await page.evaluate((id) => { const m = window.__siteWalk.game.crew.byId(id); const { camera, controls } = window.__siteWalk.game.engine; controls.minDistance = 3; controls.target.set(m.pos.x, 1.1, m.pos.z); camera.position.set(m.pos.x + 3.2, 3.2, m.pos.z + 4.2); }, id);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `test-results/crew/${id}.png` });
    }
  });
});

const playerPos = (page) => page.evaluate(() => window.__siteWalk.playerPos());

test.describe('player', () => {
  test('keyboard walks the player and the camera follows', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    const start = await playerPos(page);
    const camStart = await page.evaluate(() => window.__siteWalk.game.engine.controls.target.toArray());
    await page.keyboard.down('KeyW');
    await page.waitForFunction((s) => { const p = window.__siteWalk.playerPos(); return Math.hypot(p.x - s.x, p.z - s.z) > 2; }, start, { timeout: 90_000 });
    await page.keyboard.up('KeyW');
    const end = await playerPos(page);
    expect(end.z).toBeLessThan(start.z);                     // W walks away from the camera (north)
    // The camera eases after the player, so give it a moment to catch up.
    await page.waitForFunction((c) => { const t = window.__siteWalk.game.engine.controls.target; return Math.hypot(t.x - c[0], t.z - c[2]) > 1.5; }, camStart, { timeout: 60_000 });
  });

  test('player cannot walk through the trailer', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    // Stand east of the office door and walk west, straight at the trailer wall (x = -37.75).
    await page.evaluate(() => window.__siteWalk.teleport(-33, 24));
    await page.evaluate(() => window.__siteWalk.faceCamera(-1, 0));   // camera looks west, so W walks west
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => window.__siteWalk.playerPos().x < -36.5, null, { timeout: 90_000 });
    await page.waitForTimeout(3000);
    await page.keyboard.up('KeyW');
    expect((await playerPos(page)).x).toBeGreaterThan(-37.75 + 0.4);
  });

  test('phone joystick walks the player', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    const knob = page.locator('.sw-joystick');
    await expect(knob).toBeVisible();
    const box = await knob.boundingBox();
    const start = await playerPos(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 40, { steps: 4 });
    await page.waitForFunction((s) => { const p = window.__siteWalk.playerPos(); return Math.hypot(p.x - s.x, p.z - s.z) > 1.5; }, start, { timeout: 90_000 });
    await page.mouse.up();
    await context.close();
  });
});

// Stand next to a crew member wherever their route has taken them.
async function goTo(page, agentId) {
  await page.evaluate((id) => {
    const m = window.__siteWalk.game.crew.byId(id);
    window.__siteWalk.teleport(m.pos.x + 1.2, m.pos.z + 1.2);
  }, agentId);
}
const preset = (page, answers) => page.addInitScript((a) => {
  if (!sessionStorage.getItem('preset-done')) { localStorage.setItem('wp.sitewalk.v1', JSON.stringify({ v: 1, answers: a, lastTalked: {}, officeSeen: false })); sessionStorage.setItem('preset-done', '1'); }
}, answers);
async function talkTo(page, agentId) {
  await goTo(page, agentId);
  await page.waitForFunction((id) => document.querySelector('.sw-prompt:not([hidden])') && window.__siteWalk.game.crew.byId(id), agentId);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.sw-talk')).toBeVisible();
}

test.describe('conversations', () => {
  test('talk to a worker by keyboard', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await goTo(page, 1);
    await expect(page.locator('.sw-prompt')).toHaveText(/Press E to talk to Maria — Bid Desk/);
    await page.keyboard.press('KeyE');
    await expect(page.locator('.sw-talk')).toBeVisible();
    await expect(page.locator('.sw-talk-say')).toHaveText(/^Hey, I'm Maria\./);
    for (const k of ['1', '2', '3']) { await page.keyboard.press(`Digit${k}`); }
    await expect(page.locator('.sw-talk-say')).toHaveText(/^Thanks — that helps\./);
    expect(await page.evaluate(() => window.__siteWalk.state().answers[1])).toEqual([0, 1, 2]);
    await page.keyboard.press('Escape');
    await expect(page.locator('.sw-talk')).toBeHidden();
    await expect(page.locator('.sw-objective')).toHaveText('Talk to the crew · 1 of 3');
    await expect(page.locator('.sw-clip-row')).toHaveCount(1);
  });

  test('third conversation unlocks the office', async ({ page }) => {
    await preset(page, { 3: [1, 1, 1], 5: [2, 2, 2] });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await expect(page.locator('.sw-objective')).toHaveText('Talk to the crew · 2 of 3');
    expect(await page.evaluate(() => window.__siteWalk.game.world.officeMarker.visible)).toBe(false);
    await talkTo(page, 1);
    for (const k of ['3', '3', '2']) { await page.keyboard.press(`Digit${k}`); }
    await expect(page.locator('.sw-talk-say')).toHaveText(/The site office is open — head over when you're ready\.$/);
    await expect(page.locator('.sw-toast')).toHaveText('The site office is open');
    await expect(page.locator('.sw-objective')).toHaveText('Site office is open — head there');
    expect(await page.evaluate(() => window.__siteWalk.game.world.officeMarker.visible)).toBe(true);
  });

  test('progress survives reload', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await talkTo(page, 7);
    for (const k of ['2', '2', '2']) { await page.keyboard.press(`Digit${k}`); }
    await expect(page.locator('.sw-talk-say')).toHaveText(/^Thanks — that helps\./);
    await page.reload();
    await page.waitForFunction(() => window.__siteWalk?.isReady());
    await expect(page.locator('.sw-opening-back')).toContainText('met 1 of the crew');
    expect(await page.evaluate(() => window.__siteWalk.game.crew.byId(7).met)).toBe(true);
  });
});

const OFFICE_DOOR = [-35.5, 27];

test.describe('site office', () => {
  test('closed office explains how many more to meet', async ({ page }) => {
    await preset(page, { 3: [1, 1, 1] });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.evaluate(([x, z]) => window.__siteWalk.teleport(x, z), OFFICE_DOOR);
    await expect(page.locator('.sw-toast')).toHaveText('Talk to 2 more of the crew first');
    await expect(page.locator('.sw-results')).toBeHidden();
  });

  test('full flow', async ({ page }) => {
    await preset(page, { 3: [1, 1, 1], 5: [3, 3, 2] });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await talkTo(page, 1);
    for (const k of ['2', '3', '2']) await page.keyboard.press(`Digit${k}`);
    await page.keyboard.press('Escape');
    await page.evaluate(([x, z]) => window.__siteWalk.teleport(x, z), OFFICE_DOOR);
    await expect(page.locator('.sw-results')).toBeVisible();
    await expect(page.locator('.sw-rank-name')).toHaveText(['Field-to-Office Evidence Agent', 'Bid Desk Agent', 'PM Second Brain']);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-report="word"]').click()]);
    expect(download.suggestedFilename()).toMatch(/^site-walk-results-\d{4}-\d{2}-\d{2}\.doc$/);
    const text = await (await import('fs')).promises.readFile(await download.path(), 'utf8');
    expect(text).toContain('How do bid invites reach you today?');
  });

  test('view details from results', async ({ page }) => {
    await preset(page, { 1: [3, 3, 3], 3: [1, 1, 1], 5: [2, 2, 2] });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.evaluate(([x, z]) => window.__siteWalk.teleport(x, z), OFFICE_DOOR);
    await expect(page.locator('.sw-results')).toBeVisible();
    await page.locator('[data-details]').first().click();
    await expect(page.locator('#agentDialog')).toBeVisible();
    const onTop = await page.evaluate(() => { const r = document.getElementById('agentDialog').getBoundingClientRect(); return !!document.elementFromPoint(r.left + r.width / 2, r.top + 40)?.closest('#agentDialog'); });
    expect(onTop).toBe(true);
    // Keyboard users can move through the details dialog without being pulled behind it.
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#agentDialog'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#agentDialog')).toBeHidden();
    await expect(page.locator('.sw-results')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.dataset.details)).toBe('1');
  });

  test('print copy paginates', async ({ page }) => {
    await preset(page, { 1: [3, 3, 3], 3: [1, 1, 1], 5: [2, 2, 2] });
    await page.addInitScript(() => { window.print = () => {}; });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.evaluate(([x, z]) => window.__siteWalk.teleport(x, z), OFFICE_DOOR);
    await page.locator('[data-report="print"]').click();
    await expect(page.locator('#dvPrint')).toContainText('Bid Desk Agent');
    const pdf = await page.pdf({ format: 'Letter' });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(5000);
  });
});

test.describe('polish', () => {
  test('resize during talk', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.evaluate(() => window.__siteWalk.game.startTalk(1));
    await expect(page.locator('.sw-talk')).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    // The panel slides in over 0.3 s; poll until it has settled rather than guessing a delay.
    await expect.poll(() => page.evaluate(() => {
      const r = document.querySelector('.sw-talk').getBoundingClientRect();
      return { scroll: document.documentElement.scrollWidth <= innerWidth, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
    }), { timeout: 10_000 }).toEqual({ scroll: true, inside: true });
    await page.locator('.sw-talk-close').click();
    await expect(page.locator('.sw-joystick')).toBeVisible();
    await context.close();
  });

  test('talk panel and results are keyboard and screen-reader usable', async ({ page }) => {
    await preset(page, { 1: [3, 3, 3], 3: [1, 1, 1], 5: [2, 2, 2] });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.evaluate(() => window.__siteWalk.game.startTalk(9));
    await expect(page.locator('.sw-talk')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.closest('.sw-talk-answers') !== null)).toBe(true);
    const talkScan = await new AxeBuilder({ page }).include('.sw-talk').analyze();
    expect(talkScan.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.__siteWalk.teleport(-35.5, 27));
    await expect(page.locator('.sw-results')).toBeVisible();
    const boardScan = await new AxeBuilder({ page }).include('.sw-results').analyze();
    expect(boardScan.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    // Tab stays inside the board.
    for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('.sw-results'))).toBe(true);
  });

  test('a screen reader hears who is nearby', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await goTo(page, 1);
    await expect(page.locator('.sw-sr-live')).toHaveText('Maria, Bid Desk, is nearby. Press E to talk.');
  });

  test('reduced motion disables the typewriter', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.evaluate(() => window.__siteWalk.game.startTalk(1));
    expect(await page.locator('.sw-talk-say').textContent()).toMatch(/^Hey, I'm Maria\. How do bid invites reach you today\?$/);
  });

  test('sound toggle persists', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.locator('.sw-menu-btn').click();
    await page.locator('[data-menu="sound"]').click();
    await expect(page.locator('[data-menu="sound"]')).toHaveText('Sound: off');
    await page.reload();
    await page.waitForFunction(() => window.__siteWalk?.isReady());
    await expect(page.locator('[data-menu="sound"]')).toHaveText('Sound: off', { useInnerText: false });
  });

  test('a slow device steps the quality down', async ({ page }) => {
    await openGame(page, '/?test=1&tier=high');
    await page.getByRole('button', { name: 'Start walking' }).click();
    // Software WebGL renders far below 30 fps, so the game should drop to a lighter tier on its own.
    await page.waitForFunction(() => window.__siteWalk.game.engine.tier !== 'high', null, { timeout: 90_000 });
  });
});

test.describe('review fixes', () => {
  test('keyboard works normally on the classic pages after playing', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.locator('.sw-menu-btn').click();
    await page.locator('.sw-menu-panel').getByRole('button', { name: '10 agents' }).click();
    await expect(page.locator('#face-agents')).toBeVisible();
    // Enter on a nav link navigates; E does not start a hidden conversation.
    await page.locator('[data-face="discovery"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#face-discovery')).toBeVisible();
    await page.keyboard.press('KeyE');
    expect(await page.evaluate(() => window.__siteWalk.game.talkingId ?? null)).toBe(null);
    const down = await page.evaluate(() => { const e = new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; });
    expect(down).toBe(false);
  });

  test('skip to the agents, then come back to the site walk', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Skip to the agents' }).click();
    await expect(page.locator('#face-agents')).toBeVisible();
    await page.locator('[data-site-walk]').click();
    await expect(page.getByRole('button', { name: 'Start walking' })).toBeVisible();
    await page.getByRole('button', { name: 'Start walking' }).click();
    await expect(page.locator('.sw-objective')).toBeVisible();
  });

  test('stepping down from high keeps anti-aliasing', async ({ page }) => {
    await openGame(page, '/?test=1&tier=high');
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.waitForFunction(() => window.__siteWalk.game.engine.tier !== 'high', null, { timeout: 90_000 });
    expect(await page.evaluate(() => window.__siteWalk.game.engine.antialiased())).toBe(true);
  });
});

test.describe('jump to people', () => {
  test('Q opens the jump wheel and lands you next to the person you pick', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.keyboard.press('KeyQ');
    await expect(page.locator('.sw-wheel')).toBeVisible();
    await expect(page.locator('.sw-wheel-item')).toHaveCount(10);              // office not open yet
    await page.locator('.sw-wheel-item', { hasText: 'Rosa' }).click();
    await expect(page.locator('.sw-wheel')).toBeHidden();
    await page.waitForFunction(() => !window.__siteWalk.game.jumping, null, { timeout: 90_000 });
    const d = await page.evaluate(() => { const p = window.__siteWalk.playerPos(); const m = window.__siteWalk.game.crew.byId(2); return Math.hypot(p.x - m.pos.x, p.z - m.pos.z); });
    expect(d).toBeLessThan(3.2);
    await expect(page.locator('.sw-prompt')).toHaveText(/Rosa/);
  });

  test('phones get a Jump button', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.getByRole('button', { name: 'Jump' }).click();
    await expect(page.locator('.sw-wheel')).toBeVisible();
    await page.locator('.sw-wheel-item', { hasText: 'Andre' }).click();
    await page.waitForFunction(() => !window.__siteWalk.game.jumping, null, { timeout: 90_000 });
    const d = await page.evaluate(() => { const p = window.__siteWalk.playerPos(); const m = window.__siteWalk.game.crew.byId(7); return Math.hypot(p.x - m.pos.x, p.z - m.pos.z); });
    expect(d).toBeLessThan(3.2);
    await context.close();
  });

  test('jump straight to the site office once it is open', async ({ page }) => {
    await preset(page, { 1: [3, 3, 3], 3: [1, 1, 1], 5: [2, 2, 2] });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.keyboard.press('KeyQ');
    await page.locator('.sw-wheel-item', { hasText: 'Site office' }).click();
    await expect(page.locator('.sw-results')).toBeVisible({ timeout: 90_000 });
  });
});

test.describe('site map', () => {
  test('clicking the minimap opens the site map; clicking someone flies you there and starts the conversation', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.getByRole('button', { name: 'Open the site map' }).click();
    await expect(page.locator('.sw-map')).toBeVisible();
    await expect(page.locator('.sw-map-person')).toHaveCount(10);
    await page.getByRole('button', { name: 'Rosa, Lead / Sales Follow-Up — go and talk' }).click();
    await expect(page.locator('.sw-map')).toBeHidden();
    await expect(page.locator('.sw-talk')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.sw-talk-who')).toHaveText('ROSA · LEAD / SALES FOLLOW-UP');
  });

  test('the site map works by tap on phones', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.getByRole('button', { name: 'Open the site map' }).tap();
    await expect(page.locator('.sw-map')).toBeVisible();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    expect(fits).toBe(true);
    await page.locator('.sw-map-list button', { hasText: 'Tom' }).tap();
    await expect(page.locator('.sw-talk')).toBeVisible({ timeout: 90_000 });
    await context.close();
  });
});

test.describe('site audit', () => {
  test('walk up to a checkpoint and audit a section', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await expect(page.locator('.sw-audit-tracker')).toHaveText(/Site audit · 0 of 7/);
    await page.evaluate(() => window.__siteWalk.teleport(-48.8, 20.2));
    await expect(page.locator('.sw-prompt')).toHaveText(/Press E to audit Bidding & Pipeline/);
    await page.keyboard.press('KeyE');
    await expect(page.locator('.sw-audit')).toBeVisible();
    await expect(page.locator('.sw-audit-q')).toHaveText('How easily can your team see the current status of every active bid?');
    for (const k of ['2', '2', '2', '3', '3']) await page.keyboard.press(`Digit${k}`);
    await expect(page.locator('.sw-audit-result')).toHaveText('Fair · 8 of 15');
    await expect(page.locator('.sw-audit-tracker')).toHaveText(/Site audit · 1 of 7/);
    expect(await page.evaluate(() => window.__siteWalk.state().audit.bidding)).toEqual([1, 1, 1, 2, 2]);
  });

  test('the scorecard opens from the tracker and downloads the audit report', async ({ page }) => {
    await page.addInitScript(() => { if (!sessionStorage.getItem('p')) { localStorage.setItem('wp.sitewalk.v1', JSON.stringify({ v: 1, answers: {}, lastTalked: {}, officeSeen: false, audit: { rfis: [0, 0, 1, 0, 0] } })); sessionStorage.setItem('p', '1'); } });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.locator('.sw-audit-tracker').click();
    await expect(page.locator('.sw-scorecard')).toBeVisible();
    await expect(page.locator('.sw-score-row')).toHaveCount(7);
    await expect(page.locator('.sw-score-row').nth(3)).toContainText('Strong');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-audit-report="md"]').click()]);
    const text = await (await import('fs')).promises.readFile(await download.path(), 'utf8');
    expect(text).toContain('## RFIs & Submittals — Strong (14 / 15)');
  });

  test('checkpoints are on the site map and flying to one starts its audit', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.getByRole('button', { name: 'Open the site map' }).click();
    await expect(page.locator('.sw-map-check')).toHaveCount(7);
    await page.getByRole('button', { name: 'Closeout audit checkpoint — go and audit' }).click();
    await expect(page.locator('.sw-audit')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.sw-audit-who')).toHaveText('SITE AUDIT · CLOSEOUT');
  });
});

test.describe('site score', () => {
  test('the score rises and objectives tick off as you play', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await expect(page.locator('.sw-score-points')).toHaveText('0');
    await expect(page.locator('.sw-score-rank')).toHaveText('Visitor');
    await expect(page.locator('.sw-score-objectives')).toHaveText('Objectives 0 / 6');
    await talkTo(page, 1);
    for (const k of ['1', '2', '3']) await page.keyboard.press(`Digit${k}`);
    await expect(page.locator('.sw-score-points')).toHaveText('100');
    await expect(page.locator('.sw-score-float')).toHaveText('+100');
    await page.keyboard.press('Escape');
    await page.locator('.sw-scoreboard-btn').click();
    await expect(page.locator('.sw-objectives li').first()).toContainText('1 / 3');
  });

  test('visiting the office and saving a report complete their objectives', async ({ page }) => {
    await preset(page, { 1: [3, 3, 3], 3: [1, 1, 1], 5: [2, 2, 2] });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await expect(page.locator('.sw-score-points')).toHaveText('300');
    await page.evaluate(() => window.__siteWalk.teleport(-35.5, 27));
    await expect(page.locator('.sw-results')).toBeVisible();
    await expect(page.locator('.sw-score-points')).toHaveText('500');
    await Promise.all([page.waitForEvent('download'), page.locator('[data-report="md"]').click()]);
    await expect(page.locator('.sw-score-points')).toHaveText('600');
    await expect(page.locator('.sw-score-objectives')).toHaveText('Objectives 3 / 6');
    await expect(page.locator('.sw-toast')).toContainText('Objective complete');
  });
});

test.describe('clickable icons', () => {
  async function clickIcon(page, kind, id) {
    // Wait until the icon is on screen, then click exactly where it is drawn.
    const pt = await page.waitForFunction(([k, i]) => {
      const p = window.__siteWalk.screenOf(k, i);
      return p && p.x > 0 && p.y > 0 && p.x < innerWidth && p.y < innerHeight ? p : null;
    }, [kind, id], { timeout: 30_000 });
    const { x, y } = await pt.jsonValue();
    await page.mouse.click(x, y);
  }

  test('clicking a crew marker on screen takes you to them and starts the talk', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    // The camera looks north-east from behind you, so stand south-west of Rosa to have her in view.
    await page.evaluate(() => window.__siteWalk.teleport(24, 29));
    await clickIcon(page, 'crew', 2);
    await expect(page.locator('.sw-talk')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.sw-talk-who')).toHaveText('ROSA · LEAD / SALES FOLLOW-UP');
  });

  test('clicking an audit clipboard on screen starts that audit', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.evaluate(() => window.__siteWalk.teleport(10, 20));
    await clickIcon(page, 'audit', 'closeout');
    await expect(page.locator('.sw-audit')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.sw-audit-who')).toHaveText('SITE AUDIT · CLOSEOUT');
  });

  test('an objective’s Go button takes you to work on it', async ({ page }) => {
    await preset(page, { 1: [3, 3, 3], 3: [1, 1, 1], 5: [2, 2, 2] });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.locator('.sw-scoreboard-btn').click();
    await page.getByRole('button', { name: 'Go: Finish an audit section' }).click();
    await expect(page.locator('.sw-audit')).toBeVisible({ timeout: 90_000 });
  });

  test('a clipboard row takes you back to that crew member', async ({ page }) => {
    await preset(page, { 7: [2, 2, 2] });
    await openGame(page);
    await page.getByRole('button', { name: 'Start walking' }).click();
    await page.getByRole('button', { name: 'Go to Andre, Vendor / Subcontractor CRM' }).click();
    await expect(page.locator('.sw-talk-who')).toHaveText('ANDRE · VENDOR / SUBCONTRACTOR CRM', { timeout: 90_000 });
  });
});
