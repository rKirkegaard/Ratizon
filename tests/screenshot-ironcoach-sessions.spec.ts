import { test } from '@playwright/test';

test('Screenshot IronCoach fit/sessions with detail', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });

  await page.goto('http://localhost:8080');
  await page.waitForTimeout(2000);

  // Try to click dev user link
  const devLink = page.locator('text=testbruger');
  if (await devLink.count() > 0) {
    await devLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/ironcoach-dev-users.png' });

    // Click first user button
    const users = page.locator('button').filter({ hasText: /Rasmus|Admin|Coach|atlet/i });
    const userCount = await users.count();
    console.log('Dev users found:', userCount);
    if (userCount > 0) {
      await users.first().click();
      await page.waitForTimeout(5000);
    }
  }

  // Check current URL
  console.log('URL after login:', page.url());
  await page.screenshot({ path: 'test-results/ironcoach-after-login.png' });

  // Try navigating directly to fit/sessions
  await page.goto('http://localhost:8080/fit/sessions');
  await page.waitForTimeout(5000);
  console.log('URL after nav:', page.url());
  await page.screenshot({ path: 'test-results/ironcoach-sessions-list.png', fullPage: true });

  // Count session rows
  const sessionRows = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: /Detaljer|detaljer/i });
  const rowCount = await sessionRows.count();
  console.log('Session rows with Detaljer:', rowCount);

  // Also try locating any clickable session element
  const allButtons = await page.locator('button').count();
  console.log('Total buttons on page:', allButtons);

  if (rowCount > 0) {
    const btn = sessionRows.first().locator('button').filter({ hasText: /Detaljer/i });
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(6000);
      await page.screenshot({ path: 'test-results/ironcoach-session-detail-1.png', fullPage: true });
    }
  }
});
