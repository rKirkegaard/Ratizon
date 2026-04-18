import { test, expect } from "@playwright/test";

async function loginAsAdmin(page: any) {
  await page.goto("/dev-login");
  await page.waitForLoadState("networkidle");
  const btn = page.getByText("System Administrator").or(page.getByText("Admin User"));
  await expect(btn.first()).toBeVisible({ timeout: 10_000 });
  await btn.first().click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

test.describe("P4 - AI Coaching Features", () => {
  test("System settings page shows AI Coaching Preferences", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/indstillinger");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // AI Coaching Preferences card should be visible
    const prefsCard = page.locator('[data-testid="ai-coaching-preferences"]');
    await expect(prefsCard).toBeVisible({ timeout: 10_000 });

    // Communication style buttons
    await expect(page.locator('[data-testid="style-concise"]')).toBeVisible();
    await expect(page.locator('[data-testid="style-detailed"]')).toBeVisible();
    await expect(page.locator('[data-testid="style-motivational"]')).toBeVisible();

    // Focus area buttons
    await expect(page.locator('[data-testid="focus-endurance"]')).toBeVisible();
    await expect(page.locator('[data-testid="focus-speed"]')).toBeVisible();
    await expect(page.locator('[data-testid="focus-recovery"]')).toBeVisible();

    // Auto-suggestions toggle
    await expect(page.locator('[data-testid="auto-suggestions-toggle"]')).toBeVisible();

    // Save button
    await expect(page.locator('[data-testid="save-coaching-prefs"]')).toBeVisible();

    await page.screenshot({ path: "test-results/ai-coaching-preferences.png", fullPage: true });
  });

  test("AI Coaching Preferences - select style and focus areas", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/indstillinger");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click detailed style
    await page.locator('[data-testid="style-detailed"]').click();
    await page.waitForTimeout(200);

    // Click focus areas
    await page.locator('[data-testid="focus-endurance"]').click();
    await page.locator('[data-testid="focus-recovery"]').click();
    await page.waitForTimeout(200);

    // Save button should be enabled (dirty state)
    const saveBtn = page.locator('[data-testid="save-coaching-prefs"]');
    await expect(saveBtn).toBeEnabled();

    await page.screenshot({ path: "test-results/ai-coaching-prefs-edited.png", fullPage: true });
  });

  test("System settings page shows Alert Rules Editor", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/indstillinger");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Alert Rules Editor card should be visible
    const rulesEditor = page.locator('[data-testid="alert-rules-editor"]');
    await expect(rulesEditor).toBeVisible({ timeout: 10_000 });

    // Add new rule button
    await expect(page.locator('[data-testid="add-alert-rule"]')).toBeVisible();

    await page.screenshot({ path: "test-results/alert-rules-editor.png", fullPage: true });
  });

  test("Alert Rules Editor - create new rule", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/indstillinger");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open create form
    await page.locator('[data-testid="add-alert-rule"]').click();
    await page.waitForTimeout(300);

    // Form should be visible
    const form = page.locator('[data-testid="create-rule-form"]');
    await expect(form).toBeVisible();

    // Fill in rule name
    await page.locator('[data-testid="rule-name-input"]').fill("Test overtraening");

    // Select rule type
    await page.locator('[data-testid="rule-type-select"]').selectOption("overtraining");

    await page.screenshot({ path: "test-results/alert-rule-create-form.png", fullPage: true });
  });

  test("Calendar page shows AI Import button", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/kalender");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // AI Import button should be visible
    const aiBtn = page.locator('[data-testid="ai-import-plan-btn"]');
    await expect(aiBtn).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: "test-results/calendar-ai-import-btn.png", fullPage: true });
  });

  test("AI Training Plan Import - modal opens and has textarea", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/kalender");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click AI import button
    await page.locator('[data-testid="ai-import-plan-btn"]').click();
    await page.waitForTimeout(500);

    // Modal should appear
    const modal = page.locator('[data-testid="ai-plan-import-modal"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Textarea should be visible
    await expect(page.locator('[data-testid="plan-text-input"]')).toBeVisible();

    // Parse button should be visible but disabled (no text)
    const parseBtn = page.locator('[data-testid="parse-plan-btn"]');
    await expect(parseBtn).toBeVisible();

    await page.screenshot({ path: "test-results/ai-plan-import-modal.png", fullPage: true });
  });

  test("AI Training Plan Import - enter text and parse", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/kalender");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open AI import modal
    await page.locator('[data-testid="ai-import-plan-btn"]').click();
    await page.waitForTimeout(500);

    // Enter training plan text
    await page.locator('[data-testid="plan-text-input"]').fill(
      "Mandag: 60 min let loeb zone 2\nTirsdag: 45 min svoemning teknik\nOnsdag: 90 min cykling sweet spot"
    );

    // Parse button should be enabled
    const parseBtn = page.locator('[data-testid="parse-plan-btn"]');
    await expect(parseBtn).toBeEnabled();

    await page.screenshot({ path: "test-results/ai-plan-import-with-text.png", fullPage: true });
  });
});
