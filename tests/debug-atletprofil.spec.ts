import { test, expect } from '@playwright/test';

test('Debug atletprofil page', async ({ page }) => {
  // Login as Rasmus Mortensen (athlete)
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  await page.getByText('Rasmus Mortensen').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');

  // Go to atletprofil
  await page.goto('/indstillinger/atletprofil');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Screenshot
  await page.screenshot({ path: 'test-results/debug-atletprofil-athlete.png', fullPage: true });

  // Check console errors
  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  // Check what's visible
  const pageContent = await page.locator('[data-testid="athlete-profile-page"]').textContent().catch(() => 'NOT FOUND');
  console.log('Page content length:', pageContent?.length);
  console.log('Errors:', errors);
});

test('Debug atletprofil as admin', async ({ page }) => {
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  const btn = page.getByText('System Administrator').or(page.getByText('Admin User'));
  await btn.first().click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');

  await page.goto('/indstillinger/atletprofil');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'test-results/debug-atletprofil-admin.png', fullPage: true });
});
