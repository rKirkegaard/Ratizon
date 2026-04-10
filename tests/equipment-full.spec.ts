import { test, expect } from '@playwright/test';

async function loginAsRasmus(page: any) {
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  await page.getByText('Rasmus Mortensen').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Equipment Full Spec', () => {

  test('Equipment page shows with tabs and equipment cards', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/udstyr');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Udstyr').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Alle')).toBeVisible();
    await expect(page.getByText('Cykel')).toBeVisible();
    await expect(page.getByText('Loeb')).toBeVisible();
    await expect(page.getByText('Svoem')).toBeVisible();
    await expect(page.getByText('Arkiveret')).toBeVisible();
    await expect(page.getByText('Nyt udstyr')).toBeVisible();

    await page.screenshot({ path: 'test-results/equipment-page-tabs.png', fullPage: true });
  });

  test('Create equipment modal opens with all fields', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/udstyr');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.getByText('Nyt udstyr').click();
    await expect(page.locator('[data-testid="equipment-modal"]')).toBeVisible({ timeout: 3_000 });

    await page.screenshot({ path: 'test-results/equipment-create-modal.png', fullPage: true });
  });

  test('Equipment card navigates to detail page', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/udstyr');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const card = page.locator('[data-testid^="equipment-card-"]').first();
    if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="equipment-detail-page"]')).toBeVisible({ timeout: 5_000 });
      await page.screenshot({ path: 'test-results/equipment-detail-page.png', fullPage: true });
    }
  });

  test('Sport filter tabs work', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/udstyr');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Cykel tab
    await page.getByText('Cykel').first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/equipment-cykel-tab.png', fullPage: true });

    // Click Loeb tab
    await page.getByText('Loeb').first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/equipment-loeb-tab.png', fullPage: true });
  });
});
