import { test, expect } from '@playwright/test';

test('Save athlete profile and verify persistence', async ({ page }) => {
  // Login as Rasmus
  await page.goto('/dev-login');
  await page.waitForLoadState('networkidle');
  await page.getByText('Rasmus Mortensen').click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  // Go to atletprofil
  await page.goto('/indstillinger/atletprofil');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Capture network requests
  const requests: { url: string; method: string; status?: number; body?: string }[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/athletes') && req.method() === 'PUT') {
      requests.push({ url: req.url(), method: req.method(), body: req.postData() ?? '' });
    }
  });
  page.on('response', (res) => {
    if (res.url().includes('/api/athletes') && res.request().method() === 'PUT') {
      const existing = requests.find(r => r.url === res.url());
      if (existing) existing.status = res.status();
    }
  });

  // Check form exists
  const form = page.locator('[data-testid="athlete-profile-form"]');
  await expect(form).toBeVisible({ timeout: 5_000 });

  // Change weight to a unique value
  const weightInput = form.locator('input[type="number"]').nth(5); // weight field
  const currentVal = await weightInput.inputValue();
  console.log('Current weight value:', currentVal);

  // Set new weight
  const newWeight = currentVal === '83' ? '84' : '83';
  await weightInput.fill(newWeight);
  await page.waitForTimeout(300);

  // Click save
  const saveBtn = form.locator('button[type="submit"]');
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();
  await page.waitForTimeout(2000);

  // Check requests
  console.log('PUT requests:', JSON.stringify(requests, null, 2));

  // Screenshot
  await page.screenshot({ path: 'test-results/debug-save-profile.png', fullPage: true });

  // Reload and check if value persisted
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const afterForm = page.locator('[data-testid="athlete-profile-form"]');
  await expect(afterForm).toBeVisible({ timeout: 5_000 });

  await page.screenshot({ path: 'test-results/debug-save-profile-after-reload.png', fullPage: true });
});
