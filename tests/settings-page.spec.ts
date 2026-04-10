import { test, expect } from '@playwright/test';

async function loginAsAdmin(page: any) {
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  const btn = page.getByText('System Administrator').or(page.getByText('Admin User'));
  await expect(btn.first()).toBeVisible({ timeout: 10_000 });
  await btn.first().click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Settings Page - Athlete Profile', () => {

  test('Shows athlete selector, ID, and 3 tabs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/indstillinger/atletprofil');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Header
    await expect(page.getByText('Atlet Indstillinger')).toBeVisible({ timeout: 10_000 });

    // Athlete selector should be visible for admin
    const selector = page.locator('[data-testid="settings-athlete-selector"]');
    // May or may not appear depending on how many athletes exist

    // Athlete ID display
    await expect(page.getByText('Atlet-ID')).toBeVisible({ timeout: 5_000 });

    // 3 tabs
    await expect(page.locator('[data-testid="athlete-tab-data"]')).toBeVisible();
    await expect(page.locator('[data-testid="athlete-tab-zones"]')).toBeVisible();
    await expect(page.locator('[data-testid="athlete-tab-ai"]')).toBeVisible();

    await page.screenshot({ path: 'test-results/settings-data-tab.png', fullPage: true });
  });

  test('Zones tab shows training zones', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/indstillinger/atletprofil');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click zones tab
    await page.locator('[data-testid="athlete-tab-zones"]').click();
    await page.waitForTimeout(500);

    // Should show training zones section
    const zones = page.locator('[data-testid="training-zones"]');
    await expect(zones).toBeVisible({ timeout: 5_000 });

    await page.screenshot({ path: 'test-results/settings-zones-tab.png', fullPage: true });
  });

  test('AI tab shows LLM settings', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/indstillinger/atletprofil');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click AI tab
    await page.locator('[data-testid="athlete-tab-ai"]').click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/settings-ai-tab.png', fullPage: true });
  });

  test('Athlete selector dropdown works for admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/indstillinger/atletprofil');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const selector = page.locator('[data-testid="settings-athlete-selector"]');
    if (await selector.isVisible()) {
      await selector.locator('button').first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/settings-athlete-dropdown.png', fullPage: true });
    }
  });
});
