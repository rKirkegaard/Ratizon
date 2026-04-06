import { test } from '@playwright/test';

test('Screenshot week view with expanded session', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:8090/dev-login');
  await page.click('text=Rasmus Mortensen');
  await page.waitForURL('**/dashboard');

  await page.goto('http://localhost:8090/kalender');
  await page.waitForTimeout(2000);
  // Go back to week with data
  await page.click('text=Forrige');
  await page.waitForTimeout(2000);

  // Screenshot collapsed state
  await page.screenshot({ path: 'test-results/week-collapsed.png', fullPage: true });

  // Click first session to expand
  const sessions = page.locator('[data-testid^="session-completed-"]');
  const count = await sessions.count();
  console.log('Sessions found:', count);

  if (count > 0) {
    // Click the chevron area to expand
    const firstSession = sessions.first();
    const chevron = firstSession.locator('.cursor-pointer');
    const chevronCount = await chevron.count();
    console.log('Clickable areas:', chevronCount);

    // Collect errors
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));

    if (chevronCount > 0) {
      await chevron.first().click();
      await page.waitForTimeout(5000);

      for (const err of errors) console.log('ERR:', err);

      const charts = await page.locator('.recharts-wrapper').count();
      console.log('Charts:', charts);

      // Check if page is still on kalender
      const url = page.url();
      console.log('URL after click:', url);
    }

    await page.screenshot({ path: 'test-results/week-expanded.png', fullPage: true });
  }
});
