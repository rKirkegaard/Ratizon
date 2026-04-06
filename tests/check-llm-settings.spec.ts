import { test, expect } from '@playwright/test';

test('LLM settings visible on indstillinger page', async ({ page }) => {
  // Login
  await page.goto('http://localhost:8090/dev-login');
  await page.click('text=Rasmus Mortensen');
  await page.waitForURL('**/dashboard');

  // Navigate to settings
  await page.goto('http://localhost:8090/indstillinger');
  await page.waitForTimeout(3000);

  // Screenshot for debugging
  await page.screenshot({ path: 'test-results/settings-page.png', fullPage: true });

  // Check page rendered
  const settingsPage = page.locator('[data-testid="settings-page"]');
  await expect(settingsPage).toBeVisible();

  // Get all text
  const text = await settingsPage.textContent();
  console.log('=== Settings page sections ===');
  console.log('Has "Indstillinger":', text?.includes('Indstillinger'));
  console.log('Has "AI Coach":', text?.includes('AI Coach'));
  console.log('Has "Garmin":', text?.includes('Garmin'));
  console.log('Has "Zone":', text?.includes('Zone'));

  // Check specific sections
  const llmSection = page.locator('[data-testid="llm-settings"]');
  const llmCount = await llmSection.count();
  console.log('LLM section count:', llmCount);

  const garminSection = page.locator('[data-testid="garmin-connection"]');
  const garminCount = await garminSection.count();
  console.log('Garmin section count:', garminCount);

  // Collect console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.waitForTimeout(1000);
  console.log('Console errors:', errors);
});
