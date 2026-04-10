import { test } from '@playwright/test';
test('Debug blank page', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(`CRASH: ${err.message}`));
  await page.goto('http://localhost:8090/dev-login');
  await page.waitForTimeout(3000);
  console.log('Errors:', errors.slice(0, 3));
  await page.screenshot({ path: 'test-results/blank-debug.png' });
});
