# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game.spec.js >> Black Gold Blitz >> loads without crashing — canvas visible, loading screen gone
- Location: tests/game.spec.js:6:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/AMERICAN-Black-Gold-Blitz/
Call log:
  - navigating to "http://localhost:3001/AMERICAN-Black-Gold-Blitz/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const BASE_URL = 'http://localhost:3001/AMERICAN-Black-Gold-Blitz/';
  4   | 
  5   | test.describe('Black Gold Blitz', () => {
  6   |   test('loads without crashing — canvas visible, loading screen gone', async ({ page }) => {
  7   |     const errors = [];
  8   |     page.on('pageerror', (err) => errors.push(err.message));
  9   |     page.on('console', (msg) => {
  10  |       if (msg.type() === 'error') errors.push('[console.error] ' + msg.text());
  11  |     });
  12  | 
> 13  |     await page.goto(BASE_URL);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/AMERICAN-Black-Gold-Blitz/
  14  |     await page.waitForLoadState('networkidle');
  15  | 
  16  |     // Canvas should exist (Phaser creates it)
  17  |     const canvas = page.locator('canvas');
  18  |     await expect(canvas).toBeVisible({ timeout: 12000 });
  19  | 
  20  |     // Loading screen should be removed
  21  |     await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 12000 });
  22  | 
  23  |     // No critical JS errors
  24  |     const criticalErrors = errors.filter(e =>
  25  |       !e.includes('favicon') &&
  26  |       !e.includes('404') &&
  27  |       !e.includes('ResizeObserver')
  28  |     );
  29  |     expect(criticalErrors, 'Critical JS errors: ' + JSON.stringify(criticalErrors)).toHaveLength(0);
  30  |   });
  31  | 
  32  |   test('title screen renders content (canvas is not pure black)', async ({ page }) => {
  33  |     await page.goto(BASE_URL);
  34  |     await page.waitForLoadState('networkidle');
  35  |     await expect(page.locator('canvas')).toBeVisible({ timeout: 12000 });
  36  |     await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 12000 });
  37  | 
  38  |     // Give the game a moment to render the title screen
  39  |     await page.waitForTimeout(2000);
  40  | 
  41  |     // Canvas should have non-black pixels
  42  |     const canvasNotBlack = await page.evaluate(() => {
  43  |       const canvas = document.querySelector('canvas');
  44  |       if (!canvas) return false;
  45  |       const ctx = canvas.getContext('2d');
  46  |       if (!ctx) return false;
  47  |       const cx = Math.floor(canvas.width / 2);
  48  |       const cy = Math.floor(canvas.height / 2);
  49  |       const pixel = ctx.getImageData(cx, cy, 1, 1).data;
  50  |       return pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0;
  51  |     });
  52  | 
  53  |     expect(canvasNotBlack).toBe(true);
  54  |   });
  55  | 
  56  |   test('clicking starts the game with no errors', async ({ page }) => {
  57  |     const errors = [];
  58  |     page.on('pageerror', (err) => errors.push(err.message));
  59  | 
  60  |     await page.goto(BASE_URL);
  61  |     await page.waitForLoadState('networkidle');
  62  |     await expect(page.locator('canvas')).toBeVisible({ timeout: 12000 });
  63  |     await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 12000 });
  64  | 
  65  |     await page.waitForTimeout(1500);
  66  |     await page.locator('canvas').click();
  67  |     await page.waitForTimeout(1500);
  68  | 
  69  |     const criticalErrors = errors.filter(e =>
  70  |       !e.includes('favicon') && !e.includes('404') && !e.includes('ResizeObserver')
  71  |     );
  72  |     expect(criticalErrors, 'Errors after game start: ' + JSON.stringify(criticalErrors)).toHaveLength(0);
  73  |     await expect(page.locator('canvas')).toBeVisible();
  74  |   });
  75  | 
  76  |   test('no console errors during 5 seconds of gameplay', async ({ page }) => {
  77  |     const errors = [];
  78  |     page.on('pageerror', (err) => errors.push('PAGE: ' + err.message));
  79  |     page.on('console', (msg) => {
  80  |       if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
  81  |     });
  82  | 
  83  |     await page.goto(BASE_URL);
  84  |     await page.waitForLoadState('networkidle');
  85  |     await expect(page.locator('canvas')).toBeVisible({ timeout: 12000 });
  86  |     await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 12000 });
  87  | 
  88  |     await page.waitForTimeout(1500);
  89  |     await page.locator('canvas').click();
  90  | 
  91  |     // Simulate gameplay: move and fire
  92  |     await page.keyboard.down('KeyW');
  93  |     await page.keyboard.down('Space');
  94  |     await page.waitForTimeout(3000);
  95  |     await page.keyboard.up('KeyW');
  96  |     await page.keyboard.up('Space');
  97  |     await page.waitForTimeout(2000);
  98  | 
  99  |     const criticalErrors = errors.filter(e =>
  100 |       !e.includes('favicon') && !e.includes('404') && !e.includes('ResizeObserver')
  101 |     );
  102 |     expect(criticalErrors, 'Errors during gameplay: ' + JSON.stringify(criticalErrors)).toHaveLength(0);
  103 |   });
  104 | });
  105 | 
```