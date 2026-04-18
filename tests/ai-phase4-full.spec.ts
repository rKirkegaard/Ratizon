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

test.describe("AI Features - Full Phase 4", () => {

  test("Dashboard shows AI Suggestions panel", async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForTimeout(2000);

    // Scroll to find AI suggestions
    const suggestions = page.locator('[data-testid="ai-suggestions-panel"]');
    await suggestions.scrollIntoViewIfNeeded();
    await expect(suggestions).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: "test-results/dashboard-ai-suggestions.png", fullPage: true });
  });

  test("System settings shows LLM Usage panel", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/indstillinger");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Scroll down to find LLM usage
    const usage = page.locator('[data-testid="llm-usage-panel"]');
    await usage.scrollIntoViewIfNeeded();
    await expect(usage).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: "test-results/llm-usage-panel.png", fullPage: true });
  });

  test("System settings shows all AI sections", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/indstillinger");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // All AI sections should exist on the page
    await expect(page.locator('[data-testid="llm-usage-panel"]')).toBeVisible({ timeout: 10_000 });

    const prefs = page.locator('[data-testid="ai-coaching-preferences"]');
    await prefs.scrollIntoViewIfNeeded();
    await expect(prefs).toBeVisible();

    const rules = page.locator('[data-testid="alert-rules-editor"]');
    await rules.scrollIntoViewIfNeeded();
    await expect(rules).toBeVisible();

    await page.screenshot({ path: "test-results/settings-all-ai-sections.png", fullPage: true });
  });

  test("Performance page shows Monthly AI Summary", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/performance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const monthly = page.locator('[data-testid="ai-monthly-summary"]');
    await monthly.scrollIntoViewIfNeeded();
    await expect(monthly).toBeVisible({ timeout: 10_000 });

    // Month/year selectors
    await expect(monthly.locator("select").first()).toBeVisible();

    await page.screenshot({ path: "test-results/performance-monthly-summary.png", fullPage: true });
  });

  test("Calendar shows AI Import button and modal", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/kalender");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const aiBtn = page.locator('[data-testid="ai-import-plan-btn"]');
    await expect(aiBtn).toBeVisible();

    // Open modal
    await aiBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="ai-plan-import-modal"]')).toBeVisible();

    await page.screenshot({ path: "test-results/calendar-ai-import-modal.png", fullPage: true });
  });

  test("Coach Triage page loads", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/coach-triage");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator('[data-testid="coach-triage-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="coach-triage"]')).toBeVisible();

    await page.screenshot({ path: "test-results/coach-triage-page.png", fullPage: true });
  });

  test("Sidebar shows Coach Triage link", async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForTimeout(1000);

    // Coach Triage should be in the sidebar
    const link = page.getByText("Coach Triage");
    await expect(link).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: "test-results/sidebar-coach-triage.png" });
  });
});
