import { test, expect } from '@playwright/test';

test('Screenshot workout visualization', async ({ page }) => {
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  await page.getByText('Rasmus Mortensen').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  await page.goto('/kalender');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Find a planned session and click it
  const planned = page.locator('[data-testid^="session-planned-"]').first();
  if (await planned.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await planned.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/workout-viz-popup.png', fullPage: true });
  } else {
    await page.screenshot({ path: 'test-results/workout-viz-no-planned.png', fullPage: true });
  }
});
