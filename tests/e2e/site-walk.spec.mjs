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
    await expect(page.locator('#siteWalk canvas')).toBeVisible();
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
      await expect(page.locator('#siteWalk canvas')).toBeVisible();
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
