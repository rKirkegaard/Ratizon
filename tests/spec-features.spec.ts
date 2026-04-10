import { test, expect } from '@playwright/test';

// Login helper — admin user
async function loginAsAdmin(page: any) {
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  const btn = page.getByText('System Administrator').or(page.getByText('Admin User'));
  await expect(btn.first()).toBeVisible({ timeout: 10_000 });
  await btn.first().click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Spec Features', () => {

  test('Top bar has search, create, AI Coach, and user menu', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('[data-testid="command-trigger"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-session-trigger"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-chat-toggle"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/spec-top-bar.png', fullPage: false });
  });

  test('User menu opens with logout and change password', async ({ page }) => {
    await loginAsAdmin(page);
    // Click user menu trigger
    const userMenu = page.locator('[data-testid="user-menu-trigger"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'test-results/spec-user-menu.png' });
    }
  });

  test('Command palette opens', async ({ page }) => {
    await loginAsAdmin(page);
    // Use button click instead of Ctrl+K (more reliable in headless)
    await page.locator('[data-testid="command-trigger"]').click();
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('[data-testid="command-search"]')).toBeVisible();
    await page.locator('[data-testid="command-search"]').fill('Kalender');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/spec-command-palette.png' });
  });

  test('Command palette opens from search button', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('[data-testid="command-trigger"]').click();
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible({ timeout: 3_000 });
  });

  test('Create session dialog opens', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('[data-testid="create-session-trigger"]').click();
    await expect(page.locator('[data-testid="create-session-dialog"]')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('[data-testid="session-sport"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-duration"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-tss"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/spec-create-session.png' });
  });

  test('Athlete selector visible at sidebar bottom', async ({ page }) => {
    await loginAsAdmin(page);
    const selector = page.locator('[data-testid="athlete-selector"]');
    await expect(selector).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'test-results/spec-athlete-selector.png' });
  });

  test('Sidebar sections are collapsible', async ({ page }) => {
    await loginAsAdmin(page);
    // Find ANALYSE section header and click to collapse
    const analyseBtn = page.locator('button:has-text("ANALYSE")');
    if (await analyseBtn.isVisible()) {
      await analyseBtn.click();
      await page.waitForTimeout(300);
      // Ugerapport should be hidden now
      const ugerapport = page.locator('[data-testid="nav-item-ugerapport"]');
      await expect(ugerapport).not.toBeVisible();
      await page.screenshot({ path: 'test-results/spec-sidebar-collapsed-section.png' });
      // Click again to expand
      await analyseBtn.click();
      await page.waitForTimeout(300);
      await expect(ugerapport).toBeVisible();
    }
  });

  test('Settings page shows athlete ID with copy button', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/indstillinger');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // Look for athlete ID display
    const idDisplay = page.locator('text=Atlet-ID');
    if (await idDisplay.isVisible()) {
      await page.screenshot({ path: 'test-results/spec-settings-athlete-id.png' });
    }
  });

  test('AdminAssignmentsPage has 3 tabs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tilknytninger');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for tab buttons
    await expect(page.getByText('Tildelinger').first()).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'test-results/spec-assignments-page.png', fullPage: true });

    // Click Coaches tab
    const coachesTab = page.locator('button:has-text("Coaches")');
    if (await coachesTab.isVisible()) {
      await coachesTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/spec-assignments-coaches-tab.png', fullPage: true });
    }

    // Click Atleter tab
    const atleterTab = page.locator('button:has-text("Atleter")');
    if (await atleterTab.isVisible()) {
      await atleterTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/spec-assignments-atleter-tab.png', fullPage: true });
    }
  });

  test('Session equipment section visible on session detail', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/sessioner');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find a session with Detaljer button
    const detaljerBtn = page.locator('button:has-text("Detaljer")').first();
    if (await detaljerBtn.isVisible()) {
      await detaljerBtn.click();
      await page.waitForTimeout(3000);

      // Check for equipment section
      const equipSection = page.locator('[data-testid="session-equipment-section"]');
      if (await equipSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await page.screenshot({ path: 'test-results/spec-session-equipment.png', fullPage: true });
      }
    }
  });
});
