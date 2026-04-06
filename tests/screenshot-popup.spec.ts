import { test } from '@playwright/test';

test('Screenshot bike and run session popups', async ({ page }) => {
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

  // Find a bike session (green left border) and click it
  const bikeCards = page.locator('.border-l-2.bg-muted\\/40').filter({ hasText: /UDHOLDENHED.*km/i });
  const bikeCount = await bikeCards.count();
  console.log('Bike-like cards:', bikeCount);

  if (bikeCount > 0) {
    await bikeCards.first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'test-results/popup-bike.png', fullPage: true });

    // Check what charts are visible
    const charts = await page.locator('.recharts-wrapper').count();
    const hasWatt = await page.locator('text=WATT').count();
    const hasPuls = await page.locator('text=PULS').count();
    const hasHastighed = await page.locator('text=HASTIGHED').count();
    const hasPace = await page.locator('text=PACE').count();
    console.log('Charts:', charts, 'WATT:', hasWatt, 'PULS:', hasPuls, 'HASTIGHED:', hasHastighed, 'PACE:', hasPace);

    // Close popup
    await page.locator('.fixed.inset-0').first().click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
  }

  // Now find a run session (orange left border)
  const runCards = page.locator('.border-l-2.bg-muted\\/40').filter({ hasText: /RESTITUTION|TEMPO|TAERSKEL/i });
  const runCount = await runCards.count();
  console.log('Run-like cards:', runCount);

  if (runCount > 0) {
    await runCards.first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'test-results/popup-run.png', fullPage: true });

    const charts = await page.locator('.recharts-wrapper').count();
    const hasPace = await page.locator('text=PACE').count();
    console.log('Run charts:', charts, 'PACE:', hasPace);
  }
});
