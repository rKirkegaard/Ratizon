import { test, expect } from '@playwright/test';

test('Calendar page loads', async ({ page }) => {
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  await page.getByText('Rasmus Mortensen').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  // Capture console errors
  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(`CRASH: ${err.message}`));

  await page.goto('/kalender');
  await page.waitForTimeout(5000);

  console.log('Errors:', errors.slice(0, 5));
  await page.screenshot({ path: 'test-results/calendar-debug.png', fullPage: true });

  // Just check anything is visible
  const body = await page.locator('body').textContent();
  console.log('Body length:', body?.length);
});
