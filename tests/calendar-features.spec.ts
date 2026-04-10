import { test, expect } from '@playwright/test';

async function loginAsRasmus(page: any) {
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  await page.getByText('Rasmus Mortensen').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Calendar Features', () => {

  test('Calendar page shows toolbar with all buttons', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/kalender');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Kalender').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('I dag').first()).toBeVisible();
    await expect(page.locator('[data-testid="view-mode-week"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-mode-month"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-mode-year"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sammenlign' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importer plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eksporter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vaelg flere' })).toBeVisible();

    await page.screenshot({ path: 'test-results/calendar-toolbar.png', fullPage: true });
  });

  test('Week view shows "+ Tilfoej" buttons on day cells', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/kalender');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should be in week view by default
    const addButtons = page.locator('button:has-text("+ Tilfoej")');
    const count = await addButtons.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/calendar-week-add-buttons.png', fullPage: true });
  });

  test('View mode switching works', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/kalender');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Switch to month view
    await page.locator('[data-testid="view-mode-month"]').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/calendar-month-view.png', fullPage: true });

    // Switch to year view
    await page.locator('[data-testid="view-mode-year"]').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/calendar-year-view.png', fullPage: true });
  });

  test('Multi-select mode activates', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/kalender');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.getByText('Vaelg flere').click();
    await page.waitForTimeout(300);

    await expect(page.getByText('0 valgt')).toBeVisible();
    await expect(page.getByText('Slet valgte')).toBeVisible();
    await expect(page.getByText('Slet alle')).toBeVisible();

    await page.screenshot({ path: 'test-results/calendar-multi-select.png', fullPage: true });
  });

  test('Sport filter pills visible', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/kalender');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Alle').first()).toBeVisible();

    await page.screenshot({ path: 'test-results/calendar-sport-filter.png' });
  });
});
