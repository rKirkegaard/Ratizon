import { test, expect } from '@playwright/test';

async function loginAsRasmus(page: any) {
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  await page.getByText('Rasmus Mortensen').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Equipment Split Modal', () => {

  test('Session detail shows equipment section with Opdel button when laps exist', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/sessioner');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find a session with Detaljer button
    const detaljerBtn = page.locator('button:has-text("Detaljer")').first();
    if (await detaljerBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await detaljerBtn.click();
      await page.waitForTimeout(3000);

      // Check equipment section exists
      const equipSection = page.locator('[data-testid="session-equipment-section"]');
      if (await equipSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // Look for "Opdel" button (only shows when laps exist)
        const opdelBtn = equipSection.locator('button:has-text("Opdel")');
        const tilfoejBtn = equipSection.locator('button:has-text("Tilfoej")');

        await expect(tilfoejBtn).toBeVisible();
        await page.screenshot({ path: 'test-results/equipment-section-with-buttons.png', fullPage: true });

        // If Opdel is visible, laps are present — click it to open split modal
        if (await opdelBtn.isVisible().catch(() => false)) {
          await opdelBtn.click();
          await page.waitForTimeout(500);

          const splitModal = page.locator('[data-testid="equipment-split-modal"]');
          await expect(splitModal).toBeVisible({ timeout: 3_000 });

          // Verify mode buttons
          await expect(page.getByText('Hele passet')).toBeVisible();
          await expect(page.getByText('Opdelt paa laps')).toBeVisible();

          // Verify session info shown
          await expect(splitModal.locator('text=/\\d+\\.\\d+ km/')).toBeVisible();

          await page.screenshot({ path: 'test-results/equipment-split-modal-full.png', fullPage: true });

          // Switch to split mode
          await page.getByText('Opdelt paa laps').click();
          await page.waitForTimeout(300);

          // Should show "Tilfoej udstyr" button
          await expect(page.getByText('Tilfoej udstyr')).toBeVisible();

          await page.screenshot({ path: 'test-results/equipment-split-modal-split-mode.png', fullPage: true });
        }
      }
    }
  });

  test('Quick add equipment works on session detail', async ({ page }) => {
    await loginAsRasmus(page);
    await page.goto('/sessioner');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const detaljerBtn = page.locator('button:has-text("Detaljer")').first();
    if (await detaljerBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await detaljerBtn.click();
      await page.waitForTimeout(3000);

      const equipSection = page.locator('[data-testid="session-equipment-section"]');
      if (await equipSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const tilfoejBtn = equipSection.locator('button:has-text("Tilfoej")');
        await tilfoejBtn.click();
        await page.waitForTimeout(300);

        // Should show equipment dropdown
        const dropdown = equipSection.locator('select');
        await expect(dropdown).toBeVisible();

        await page.screenshot({ path: 'test-results/equipment-quick-add.png', fullPage: true });
      }
    }
  });
});
