import { test, expect } from '@playwright/test';

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
