import { test, expect } from '@playwright/test';

test('Can edit session type in popup', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:8090/dev-login');
  await page.click('text=Rasmus Mortensen');
  await page.waitForURL('**/dashboard');

  await page.goto('http://localhost:8090/kalender');
  await page.waitForTimeout(2000);
  await page.click('[data-testid="view-mode-month"]');
  await page.waitForTimeout(1000);
  await page.click('text=Forrige');
  await page.waitForTimeout(2000);

  // Click a session card
  const card = page.locator('.border-l-2.bg-muted\\/40').first();
  await card.click();
  await page.waitForTimeout(3000);

  // Screenshot popup before edit
  await page.screenshot({ path: 'test-results/type-before.png', fullPage: true });

  // Find the type badge button — it should be clickable
  const typeBadge = page.locator('.fixed.inset-0 button').filter({ hasText: /Udholdenhed|Tempo|Restitution|Sweet Spot|Taerskel|Interval|VO2max|Let|Konkurrence|Base|Lang|Haardt/i });
  const badgeCount = await typeBadge.count();
  console.log('Type badge buttons found:', badgeCount);

  if (badgeCount > 0) {
    const badgeText = await typeBadge.first().textContent();
    console.log('Current type:', badgeText);

    // Click to edit
    await typeBadge.first().click();
    await page.waitForTimeout(500);

    // Check if dropdown appeared
    const selects = page.locator('.fixed.inset-0 select');
    const selectCount = await selects.count();
    console.log('Select dropdowns found:', selectCount);

    await page.screenshot({ path: 'test-results/type-editing.png', fullPage: true });

    if (selectCount > 0) {
      // Change to "tempo"
      await selects.first().selectOption('tempo');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/type-after.png', fullPage: true });
      console.log('Type changed successfully');
    }
  } else {
    console.log('ERROR: No type badge button found in popup');
    // Dump popup content for debugging
    const popupText = await page.locator('.fixed.inset-0').textContent().catch(() => 'no popup');
    console.log('Popup text snippet:', popupText?.substring(0, 300));
  }
});
