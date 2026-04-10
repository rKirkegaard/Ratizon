import { test, expect } from '@playwright/test';

test.describe('AdminUsersPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev-login');
    await page.waitForLoadState('networkidle');
    const adminButton = page.getByText('System Administrator').or(page.getByText('Admin User'));
    await expect(adminButton.first()).toBeVisible({ timeout: 10_000 });
    await adminButton.first().click();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
  });

  async function navigateAndWaitForUsers(page: any) {
    await page.goto('/admin/brugere');
    await page.waitForLoadState('networkidle');
    const rows = page.locator('tr[data-testid^="user-row-"]');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    return rows;
  }

  async function openDropdownForRow(page: any, row: any) {
    await row.locator('button').last().click();
    const dropdown = page.locator('[data-testid="action-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    return dropdown;
  }

  test('Page renders with stats, search, users table', async ({ page }) => {
    const rows = await navigateAndWaitForUsers(page);

    await expect(page.getByRole('heading', { name: 'Brugeradministration' })).toBeVisible();
    await expect(page.locator('[data-testid="user-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-user-btn"]')).toBeVisible();
    await expect(page.getByText('Atleter').first()).toBeVisible();
    await expect(page.getByText('Traenere')).toBeVisible();
    await expect(page.getByText('Administratorer')).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/admin-users-page.png', fullPage: true });
  });

  test('Action dropdown fully visible for bottom row', async ({ page }) => {
    const rows = await navigateAndWaitForUsers(page);
    const rowCount = await rows.count();

    await openDropdownForRow(page, rows.nth(rowCount - 1));

    await expect(page.getByText('Rediger')).toBeVisible();
    await expect(page.getByText('Slet bruger')).toBeVisible();

    await page.screenshot({ path: 'test-results/admin-users-dropdown.png', fullPage: true });
  });

  test('Create user dialog', async ({ page }) => {
    await navigateAndWaitForUsers(page);
    await page.locator('[data-testid="create-user-btn"]').click();
    await expect(page.getByText('Opret ny bruger')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('[data-testid="create-firstName"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-lastName"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-role"]')).toBeVisible();

    await page.screenshot({ path: 'test-results/admin-users-create-dialog.png', fullPage: true });
  });

  test('Edit dialog opens with user fields', async ({ page }) => {
    const rows = await navigateAndWaitForUsers(page);
    // Use second row to avoid self-editing issues
    const row = rows.nth(1);
    await openDropdownForRow(page, row);
    await page.getByText('Rediger').click();

    await expect(page.getByText('Rediger bruger')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="edit-firstName"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-lastName"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-role"]')).toBeVisible();

    await page.screenshot({ path: 'test-results/admin-users-edit-dialog.png', fullPage: true });
  });

  test('Permissions dialog for athlete', async ({ page }) => {
    const rows = await navigateAndWaitForUsers(page);
    const athleteRows = rows.filter({ hasText: 'Atlet' });
    const athleteCount = await athleteRows.count();

    if (athleteCount > 0) {
      await openDropdownForRow(page, athleteRows.first());
      const permItem = page.getByText('Siderettigheder');
      await expect(permItem).toBeVisible({ timeout: 3_000 });
      await permItem.click();
      await expect(page.getByText('Gem rettigheder')).toBeVisible({ timeout: 5_000 });
      await page.screenshot({ path: 'test-results/admin-users-permissions-athlete.png', fullPage: true });
    }
  });

  test('Permissions dialog for coach', async ({ page }) => {
    const rows = await navigateAndWaitForUsers(page);
    const coachRows = rows.filter({ hasText: 'Traener' });
    const coachCount = await coachRows.count();

    if (coachCount > 0) {
      await openDropdownForRow(page, coachRows.first());
      const permItem = page.getByText('Siderettigheder');
      await expect(permItem).toBeVisible({ timeout: 3_000 });
      await permItem.click();
      await expect(page.getByText('Gem rettigheder')).toBeVisible({ timeout: 5_000 });
      await page.screenshot({ path: 'test-results/admin-users-permissions-coach.png', fullPage: true });
    }
  });

  test('Search filters users', async ({ page }) => {
    const rows = await navigateAndWaitForUsers(page);
    const initialCount = await rows.count();

    await page.locator('[data-testid="user-search"]').fill('zzzznonexistent');
    await expect(page.getByText('Ingen brugere fundet')).toBeVisible({ timeout: 3_000 });

    await page.locator('[data-testid="user-search"]').fill('');
    await page.waitForTimeout(300);
    expect(await rows.count()).toBe(initialCount);
  });

  test('Set password dialog', async ({ page }) => {
    const rows = await navigateAndWaitForUsers(page);
    await openDropdownForRow(page, rows.nth(1));
    await page.getByText('Saet password').click();

    await expect(page.locator('[data-testid="set-password-input"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible();

    await page.screenshot({ path: 'test-results/admin-users-set-password-dialog.png', fullPage: true });
  });

  test('Delete dialog with warning', async ({ page }) => {
    const rows = await navigateAndWaitForUsers(page);
    const rowCount = await rows.count();

    if (rowCount > 1) {
      await openDropdownForRow(page, rows.nth(rowCount - 1));
      await page.getByText('Slet bruger').click();

      await expect(page.getByText('Advarsel:')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('[data-testid="delete-confirm"]')).toBeVisible();

      await page.screenshot({ path: 'test-results/admin-users-delete-dialog.png', fullPage: true });
    }
  });
});
