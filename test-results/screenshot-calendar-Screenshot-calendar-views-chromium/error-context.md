# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: screenshot-calendar.spec.ts >> Screenshot calendar views
- Location: tests\screenshot-calendar.spec.ts:3:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('text=Rasmus Mortensen')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:react-swc] x Expected '</', got '}' ,-[C:/Privat/Development/Ratizon/src/presentation/components/calendar/MonthView.tsx:209:1] 206 | 207 | return ( 208 | <div key={wi} className=\"grid gap-0 border-b border-border/50 last:border-b-0\" style={{ gridTemplateColumns: \"repeat(7, 1fr) 200px\" }} 209 | {/* Day cells */} : ^ 210 | {week.map((day) => { 211 | const key = format(day, \"yyyy-MM-dd\"); 212 | const inMonth = isSameMonth(day, monthStart); `---- Caused by: Syntax Error"
  - generic [ref=e5]: C:/Privat/Development/Ratizon/src/presentation/components/calendar/MonthView.tsx
  - generic [ref=e6]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e7]: server.hmr.overlay
    - text: to
    - code [ref=e8]: "false"
    - text: in
    - code [ref=e9]: vite.config.ts
    - text: .
```

# Test source

```ts
  1  | import { test } from '@playwright/test';
  2  | 
  3  | test('Screenshot calendar views', async ({ page }) => {
  4  |   await page.setViewportSize({ width: 1400, height: 900 });
  5  |   await page.goto('http://localhost:8090/dev-login');
> 6  |   await page.click('text=Rasmus Mortensen');
     |              ^ Error: page.click: Test timeout of 60000ms exceeded.
  7  |   await page.waitForURL('**/dashboard');
  8  | 
  9  |   await page.goto('http://localhost:8090/kalender');
  10 |   await page.waitForTimeout(2000);
  11 |   await page.click('text=Forrige');
  12 |   await page.waitForTimeout(2000);
  13 |   await page.screenshot({ path: 'test-results/calendar-week-data.png', fullPage: true });
  14 | 
  15 |   // Month view - go to March which has lots of data
  16 |   await page.click('[data-testid="view-mode-month"]');
  17 |   await page.waitForTimeout(1000);
  18 |   await page.click('text=Forrige');
  19 |   await page.waitForTimeout(2000);
  20 |   await page.screenshot({ path: 'test-results/calendar-month.png', fullPage: true });
  21 | 
  22 |   await page.click('[data-testid="view-mode-year"]');
  23 |   await page.waitForTimeout(2000);
  24 |   await page.screenshot({ path: 'test-results/calendar-year.png', fullPage: true });
  25 | });
  26 | 
```