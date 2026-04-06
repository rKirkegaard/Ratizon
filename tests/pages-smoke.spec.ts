import { test, expect, type Page } from '@playwright/test';

const ROUTES = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/kalender', label: 'Kalender' },
  { path: '/ugerapport', label: 'Ugerapport' },
  { path: '/performance', label: 'Performance' },
  { path: '/load-restitution', label: 'Load & Restitution' },
  { path: '/wellness', label: 'Wellness' },
  { path: '/disciplin/swim', label: 'Disciplin Swim' },
  { path: '/disciplin/bike', label: 'Disciplin Bike' },
  { path: '/disciplin/run', label: 'Disciplin Run' },
  { path: '/saeson-maal', label: 'Sæson Mål' },
  { path: '/sessioner', label: 'Sessioner' },
  { path: '/upload', label: 'Upload' },
  { path: '/udstyr', label: 'Udstyr' },
  { path: '/indstillinger', label: 'Indstillinger' },
  { path: '/raceplan', label: 'Raceplan' },
  { path: '/sammenligning', label: 'Sammenligning' },
  { path: '/test-resultater', label: 'Test & Baselines' },
];

// Shared auth state across all tests in this file
let authedPage: Page;

test.describe('Smoke test all pages', () => {
  test.describe.configure({ mode: 'default' });

  for (const route of ROUTES) {
    test(`Page: ${route.label} (${route.path})`, async ({ page }, testInfo) => {
      // Set up auth from localStorage by navigating first, then injecting
      // We need to navigate to a page on the same origin first
      await page.goto('/dev-login');
      await page.waitForLoadState('networkidle');

      // Click Rasmus Mortensen to log in
      const userButton = page.getByText('Rasmus Mortensen');
      await expect(userButton).toBeVisible({ timeout: 10_000 });
      await userButton.click();
      await page.waitForURL('**/dashboard', { timeout: 15_000 });
      await page.waitForLoadState('networkidle');

      // Collect console errors
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Collect page crashes
      let pageCrashed = false;
      page.on('pageerror', (err) => {
        consoleErrors.push(`PAGE_ERROR: ${err.message}`);
        pageCrashed = true;
      });

      // Navigate to the route
      await page.goto(route.path, { waitUntil: 'networkidle', timeout: 30_000 });

      // Wait a bit for async rendering
      await page.waitForTimeout(3000);

      // Check for error boundary text (common React error boundary patterns)
      const errorBoundary = await page.evaluate(() => {
        const body = document.body.innerText;
        const patterns = [
          'Something went wrong',
          'An error occurred',
          'Error boundary',
          'Uncaught error',
          'Cannot read properties of undefined',
          'Cannot read properties of null',
        ];
        for (const p of patterns) {
          if (body.includes(p)) return p;
        }
        return null;
      });

      // Try to get the page heading
      const heading = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        if (h1) return h1.innerText;
        const h2 = document.querySelector('h2');
        if (h2) return h2.innerText;
        return '(no heading found)';
      });

      // Attach results as annotations for the report
      const result = {
        route: route.path,
        label: route.label,
        heading,
        errorBoundary,
        consoleErrors,
        pageCrashed,
      };

      // Print results to stdout for easy parsing
      console.log(`\n=== ${route.label} (${route.path}) ===`);
      console.log(`  Heading: ${heading}`);
      console.log(`  Error boundary: ${errorBoundary ?? 'none'}`);
      console.log(`  Console errors (${consoleErrors.length}):`);
      for (const e of consoleErrors) {
        console.log(`    - ${e}`);
      }
      console.log(`  Page crashed: ${pageCrashed}`);

      // Soft-fail: we still want to see all pages, so use soft assertions
      // But mark test as failed if there are TypeErrors or ReferenceErrors
      const criticalErrors = consoleErrors.filter(
        (e) =>
          e.includes('TypeError') ||
          e.includes('ReferenceError') ||
          e.includes('PAGE_ERROR')
      );

      if (criticalErrors.length > 0 || errorBoundary) {
        testInfo.annotations.push({
          type: 'issue',
          description: `Critical errors on ${route.path}: ${criticalErrors.join('; ')} ${errorBoundary ? '| ErrorBoundary: ' + errorBoundary : ''}`,
        });
        // Use soft assertion so all pages still run
        expect.soft(
          criticalErrors.length === 0 && !errorBoundary,
          `Page ${route.path} has critical errors:\n${criticalErrors.join('\n')}\nError boundary: ${errorBoundary}`
        ).toBeTruthy();
      }
    });
  }
});
