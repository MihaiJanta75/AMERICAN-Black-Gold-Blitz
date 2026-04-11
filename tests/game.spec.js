import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001/AMERICAN-Black-Gold-Blitz/';

test.describe('Black Gold Blitz', () => {
  test('loads without crashing — canvas visible, loading screen gone', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push('[console.error] ' + msg.text());
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Canvas should exist (Phaser creates it)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 12000 });

    // Loading screen should be removed
    await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 12000 });

    // No critical JS errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('ResizeObserver')
    );
    expect(criticalErrors, 'Critical JS errors: ' + JSON.stringify(criticalErrors)).toHaveLength(0);
  });

  test('title screen renders content (canvas is not pure black)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 12000 });
    await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 12000 });

    // Give the game a moment to render the title screen
    await page.waitForTimeout(2000);

    // Canvas should have non-black pixels
    const canvasNotBlack = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const cx = Math.floor(canvas.width / 2);
      const cy = Math.floor(canvas.height / 2);
      const pixel = ctx.getImageData(cx, cy, 1, 1).data;
      return pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0;
    });

    expect(canvasNotBlack).toBe(true);
  });

  test('clicking starts the game with no errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 12000 });
    await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 12000 });

    await page.waitForTimeout(1500);
    await page.locator('canvas').click();
    await page.waitForTimeout(1500);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('ResizeObserver')
    );
    expect(criticalErrors, 'Errors after game start: ' + JSON.stringify(criticalErrors)).toHaveLength(0);
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('no console errors during 5 seconds of gameplay', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push('PAGE: ' + err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 12000 });
    await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 12000 });

    await page.waitForTimeout(1500);
    await page.locator('canvas').click();

    // Simulate gameplay: move and fire
    await page.keyboard.down('KeyW');
    await page.keyboard.down('Space');
    await page.waitForTimeout(3000);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('Space');
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('ResizeObserver')
    );
    expect(criticalErrors, 'Errors during gameplay: ' + JSON.stringify(criticalErrors)).toHaveLength(0);
  });
});
