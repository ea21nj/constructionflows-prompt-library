import { test, expect } from '@playwright/test';

const OPENING = 'Walk the site and talk to the crew — each one is an AI agent that could help your business. After you\'ve met 3, head to the site office for your results. Prefer the classic pages? Use the menu.';

async function openGame(page, path = '/?test=1') {
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
