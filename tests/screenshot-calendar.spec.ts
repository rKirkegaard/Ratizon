import { test } from '@playwright/test';

test('Screenshot calendar views', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:8090/dev-login');
  await page.click('text=Rasmus Mortensen');
  await page.waitForURL('**/dashboard');

  await page.goto('http://localhost:8090/kalender');
  await page.waitForTimeout(2000);
  await page.click('text=Forrige');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/calendar-week-data.png', fullPage: true });

  // Month view - go to March which has lots of data
  await page.click('[data-testid="view-mode-month"]');
  await page.waitForTimeout(1000);
  await page.click('text=Forrige');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/calendar-month.png', fullPage: true });

  await page.click('[data-testid="view-mode-year"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/calendar-year.png', fullPage: true });
});
