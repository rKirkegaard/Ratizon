# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-phase4-full.spec.ts >> AI Features - Full Phase 4 >> System settings shows all AI sections
- Location: tests\ai-phase4-full.spec.ts:41:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.scrollIntoViewIfNeeded: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-testid="ai-coaching-preferences"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: Ratizon
      - button [ref=e7] [cursor=pointer]:
        - img [ref=e8]
    - navigation [ref=e10]:
      - generic [ref=e11]:
        - button "DAGLIGT" [ref=e12] [cursor=pointer]:
          - generic [ref=e13]: DAGLIGT
          - img [ref=e14]
        - link "Dashboard" [ref=e16] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e17]
          - generic [ref=e22]: Dashboard
        - link "Kalender" [ref=e23] [cursor=pointer]:
          - /url: /kalender
          - img [ref=e24]
          - generic [ref=e26]: Kalender
      - generic [ref=e27]:
        - button "ANALYSE" [ref=e28] [cursor=pointer]:
          - generic [ref=e29]: ANALYSE
          - img [ref=e30]
        - link "Ugerapport" [ref=e32] [cursor=pointer]:
          - /url: /ugerapport
          - img [ref=e33]
          - generic [ref=e36]: Ugerapport
        - link "Performance" [ref=e37] [cursor=pointer]:
          - /url: /performance
          - img [ref=e38]
          - generic [ref=e41]: Performance
        - link "Load & Restitution" [ref=e42] [cursor=pointer]:
          - /url: /load-restitution
          - img [ref=e43]
          - generic [ref=e45]: Load & Restitution
        - link "Wellness" [ref=e46] [cursor=pointer]:
          - /url: /wellness
          - img [ref=e47]
          - generic [ref=e49]: Wellness
        - link "Sammenligning" [ref=e50] [cursor=pointer]:
          - /url: /sammenligning
          - img [ref=e51]
          - generic [ref=e53]: Sammenligning
        - link "Test & Baselines" [ref=e54] [cursor=pointer]:
          - /url: /test-resultater
          - img [ref=e55]
          - generic [ref=e57]: Test & Baselines
      - generic [ref=e58]:
        - button "DISCIPLIN" [ref=e59] [cursor=pointer]:
          - generic [ref=e60]: DISCIPLIN
          - img [ref=e61]
        - link "Lob" [ref=e63] [cursor=pointer]:
          - /url: /disciplin/run
          - img [ref=e64]
          - generic [ref=e67]: Lob
        - link "Cykling" [ref=e68] [cursor=pointer]:
          - /url: /disciplin/bike
          - img [ref=e69]
          - generic [ref=e74]: Cykling
        - link "Svomning" [ref=e75] [cursor=pointer]:
          - /url: /disciplin/swim
          - img [ref=e76]
          - generic [ref=e80]: Svomning
      - generic [ref=e81]:
        - button "PLAN & MAAL" [ref=e82] [cursor=pointer]:
          - generic [ref=e83]: PLAN & MAAL
          - img [ref=e84]
        - link "Saeson & Maal" [ref=e86] [cursor=pointer]:
          - /url: /saeson-maal
          - img [ref=e87]
          - generic [ref=e91]: Saeson & Maal
        - link "Raceplan" [ref=e92] [cursor=pointer]:
          - /url: /raceplan
          - img [ref=e93]
          - generic [ref=e95]: Raceplan
        - link "AI Coach" [ref=e96] [cursor=pointer]:
          - /url: /coach-assistent
          - img [ref=e97]
          - generic [ref=e99]: AI Coach
        - link "Coach Triage" [ref=e100] [cursor=pointer]:
          - /url: /coach-triage
          - img [ref=e101]
          - generic [ref=e106]: Coach Triage
      - generic [ref=e107]:
        - button "DATA" [ref=e108] [cursor=pointer]:
          - generic [ref=e109]: DATA
          - img [ref=e110]
        - link "Sessioner" [ref=e112] [cursor=pointer]:
          - /url: /sessioner
          - img [ref=e113]
          - generic [ref=e114]: Sessioner
        - link "Upload" [ref=e115] [cursor=pointer]:
          - /url: /upload
          - img [ref=e116]
          - generic [ref=e119]: Upload
        - link "Udstyr" [ref=e120] [cursor=pointer]:
          - /url: /udstyr
          - img [ref=e121]
          - generic [ref=e123]: Udstyr
      - generic [ref=e124]:
        - button "INDSTILLINGER" [ref=e125] [cursor=pointer]:
          - generic [ref=e126]: INDSTILLINGER
          - img [ref=e127]
        - link "Atletdata" [ref=e129] [cursor=pointer]:
          - /url: /indstillinger/atletprofil
          - img [ref=e130]
          - generic [ref=e142]: Atletdata
        - link "App & Zoner" [ref=e143] [cursor=pointer]:
          - /url: /indstillinger
          - img [ref=e144]
          - generic [ref=e147]: App & Zoner
      - generic [ref=e148]:
        - button "DEV" [ref=e149] [cursor=pointer]:
          - generic [ref=e150]: DEV
          - img [ref=e151]
        - link "UX Test Lab" [ref=e153] [cursor=pointer]:
          - /url: /ux-test
          - img [ref=e154]
          - generic [ref=e156]: UX Test Lab
      - generic [ref=e157]:
        - button "ADMIN" [ref=e158] [cursor=pointer]:
          - generic [ref=e159]: ADMIN
          - img [ref=e160]
        - link "Brugere" [ref=e162] [cursor=pointer]:
          - /url: /admin/brugere
          - img [ref=e163]
          - generic [ref=e166]: Brugere
        - link "Tilknytninger" [ref=e167] [cursor=pointer]:
          - /url: /admin/tilknytninger
          - img [ref=e168]
          - generic [ref=e170]: Tilknytninger
        - link "System Indstillinger" [ref=e171] [cursor=pointer]:
          - /url: /admin/indstillinger
          - img [ref=e172]
          - generic [ref=e174]: System Indstillinger
    - button "TR Aktiv atlet Thomas Ringstrøm" [ref=e176] [cursor=pointer]:
      - generic [ref=e177]: TR
      - generic [ref=e178]:
        - generic [ref=e179]: Aktiv atlet
        - generic [ref=e180]: Thomas Ringstrøm
      - img [ref=e181]
  - generic [ref=e183]:
    - banner [ref=e184]:
      - button "Soeg... Ctrl+K" [ref=e185] [cursor=pointer]:
        - generic [ref=e186]: Soeg...
        - generic [ref=e187]: Ctrl+K
      - button "+ Opret" [ref=e188] [cursor=pointer]:
        - generic [ref=e189]: + Opret
      - button "AI Coach" [ref=e190] [cursor=pointer]:
        - img [ref=e191]
        - generic [ref=e193]: AI Coach
      - button "SA System Administrator" [ref=e194] [cursor=pointer]:
        - generic [ref=e195]: SA
        - generic [ref=e196]: System
        - generic [ref=e197]: Administrator
    - main [ref=e199]:
      - generic [ref=e200]:
        - generic [ref=e201]:
          - heading "System Indstillinger" [level=1] [ref=e202]
          - paragraph [ref=e203]: Konfigurer AI, prompts, API-noegler, zone-farver og system-standarder
        - generic [ref=e204]:
          - button "AI & LLM" [ref=e205] [cursor=pointer]:
            - img [ref=e206]
            - text: AI & LLM
          - button "Prompts" [ref=e216] [cursor=pointer]:
            - img [ref=e217]
            - text: Prompts
          - button "Alerts & Coaching" [ref=e220] [cursor=pointer]:
            - img [ref=e221]
            - text: Alerts & Coaching
          - button "Visuals & Kalender" [ref=e223] [cursor=pointer]:
            - img [ref=e224]
            - text: Visuals & Kalender
          - button "Integrationer" [ref=e230] [cursor=pointer]:
            - img [ref=e231]
            - text: Integrationer
        - generic [ref=e233]:
          - generic [ref=e234]:
            - generic [ref=e235]:
              - img [ref=e236]
              - heading "AI Standard-indstillinger" [level=2] [ref=e246]
            - paragraph [ref=e247]: Nedarves af atleter medmindre de har brugerdefinerede praeferencer.
            - generic [ref=e248]:
              - generic [ref=e249]:
                - generic [ref=e250]: Standard provider
                - combobox [ref=e251]:
                  - option "OpenAI" [selected]
                  - option "Anthropic"
                  - option "Google (Gemini)"
                  - option "Mistral"
                  - option "Lokal (Ollama)"
              - generic [ref=e252]:
                - generic [ref=e253]: Standard model
                - combobox [ref=e254]:
                  - option "Vaelg model..."
                  - option "GPT-4o"
                  - option "GPT-4o Mini" [selected]
                  - option "GPT-4 Turbo"
                  - option "GPT-4.1"
                  - option "GPT-4.1 Mini"
                  - option "GPT-4.1 Nano"
                  - option "o3-mini"
            - generic [ref=e255]:
              - generic [ref=e256]:
                - img [ref=e257]
                - generic [ref=e261]: API Noegle — OpenAI
                - generic [ref=e262]: Konfigureret
              - generic [ref=e263]:
                - generic [ref=e264]:
                  - textbox "sk-..." [ref=e265]
                  - button [ref=e266] [cursor=pointer]:
                    - img [ref=e267]
                - button "Gem" [disabled] [ref=e270]:
                  - img [ref=e271]
                  - text: Gem
              - button "Fjern noegle" [ref=e275] [cursor=pointer]:
                - img [ref=e276]
                - text: Fjern noegle
            - generic [ref=e279]:
              - generic [ref=e280]:
                - generic [ref=e281]: Traeningsdata range
                - combobox [ref=e282]:
                  - option "Enkelt session"
                  - option "1 uge"
                  - option "2 uger" [selected]
                  - option "3 uger"
                  - option "4 uger"
              - generic [ref=e283]:
                - generic [ref=e284]: Globalt maanedligt budget (USD)
                - spinbutton [ref=e285]: "20"
            - button "Gem AI indstillinger" [ref=e286] [cursor=pointer]:
              - img [ref=e287]
              - text: Gem AI indstillinger
          - generic [ref=e291]:
            - generic [ref=e292]:
              - img [ref=e293]
              - heading "AI Forbrug — Denne Maaned" [level=2] [ref=e295]
            - generic [ref=e296]:
              - generic [ref=e297]:
                - img [ref=e298]
                - generic [ref=e300]: $0.00
                - generic [ref=e301]: Omkostning
              - generic [ref=e302]:
                - img [ref=e303]
                - generic [ref=e305]: "692"
                - generic [ref=e306]: Tokens
              - generic [ref=e307]:
                - img [ref=e308]
                - generic [ref=e311]: "2"
                - generic [ref=e312]: Forespoegsler
            - generic [ref=e314]:
              - generic [ref=e315]: "Budget: $0.00 / $20.00"
              - generic [ref=e316]: 0%
            - generic [ref=e318]:
              - paragraph [ref=e319]: Fordelt pr. provider
              - generic [ref=e321]:
                - generic [ref=e322]: OpenAI
                - generic [ref=e323]:
                  - generic [ref=e324]: $0.00
                  - generic [ref=e325]: 2 req
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | async function loginAsAdmin(page: any) {
  4   |   await page.goto("/dev-login");
  5   |   await page.waitForLoadState("networkidle");
  6   |   const btn = page.getByText("System Administrator").or(page.getByText("Admin User"));
  7   |   await expect(btn.first()).toBeVisible({ timeout: 10_000 });
  8   |   await btn.first().click();
  9   |   await page.waitForURL("**/dashboard", { timeout: 15_000 });
  10  |   await page.waitForLoadState("networkidle");
  11  | }
  12  | 
  13  | test.describe("AI Features - Full Phase 4", () => {
  14  | 
  15  |   test("Dashboard shows AI Suggestions panel", async ({ page }) => {
  16  |     await loginAsAdmin(page);
  17  |     await page.waitForTimeout(2000);
  18  | 
  19  |     // Scroll to find AI suggestions
  20  |     const suggestions = page.locator('[data-testid="ai-suggestions-panel"]');
  21  |     await suggestions.scrollIntoViewIfNeeded();
  22  |     await expect(suggestions).toBeVisible({ timeout: 10_000 });
  23  | 
  24  |     await page.screenshot({ path: "test-results/dashboard-ai-suggestions.png", fullPage: true });
  25  |   });
  26  | 
  27  |   test("System settings shows LLM Usage panel", async ({ page }) => {
  28  |     await loginAsAdmin(page);
  29  |     await page.goto("/admin/indstillinger");
  30  |     await page.waitForLoadState("networkidle");
  31  |     await page.waitForTimeout(2000);
  32  | 
  33  |     // Scroll down to find LLM usage
  34  |     const usage = page.locator('[data-testid="llm-usage-panel"]');
  35  |     await usage.scrollIntoViewIfNeeded();
  36  |     await expect(usage).toBeVisible({ timeout: 10_000 });
  37  | 
  38  |     await page.screenshot({ path: "test-results/llm-usage-panel.png", fullPage: true });
  39  |   });
  40  | 
  41  |   test("System settings shows all AI sections", async ({ page }) => {
  42  |     await loginAsAdmin(page);
  43  |     await page.goto("/admin/indstillinger");
  44  |     await page.waitForLoadState("networkidle");
  45  |     await page.waitForTimeout(2000);
  46  | 
  47  |     // All AI sections should exist on the page
  48  |     await expect(page.locator('[data-testid="llm-usage-panel"]')).toBeVisible({ timeout: 10_000 });
  49  | 
  50  |     const prefs = page.locator('[data-testid="ai-coaching-preferences"]');
> 51  |     await prefs.scrollIntoViewIfNeeded();
      |                 ^ Error: locator.scrollIntoViewIfNeeded: Test timeout of 60000ms exceeded.
  52  |     await expect(prefs).toBeVisible();
  53  | 
  54  |     const rules = page.locator('[data-testid="alert-rules-editor"]');
  55  |     await rules.scrollIntoViewIfNeeded();
  56  |     await expect(rules).toBeVisible();
  57  | 
  58  |     await page.screenshot({ path: "test-results/settings-all-ai-sections.png", fullPage: true });
  59  |   });
  60  | 
  61  |   test("Performance page shows Monthly AI Summary", async ({ page }) => {
  62  |     await loginAsAdmin(page);
  63  |     await page.goto("/performance");
  64  |     await page.waitForLoadState("networkidle");
  65  |     await page.waitForTimeout(2000);
  66  | 
  67  |     const monthly = page.locator('[data-testid="ai-monthly-summary"]');
  68  |     await monthly.scrollIntoViewIfNeeded();
  69  |     await expect(monthly).toBeVisible({ timeout: 10_000 });
  70  | 
  71  |     // Month/year selectors
  72  |     await expect(monthly.locator("select").first()).toBeVisible();
  73  | 
  74  |     await page.screenshot({ path: "test-results/performance-monthly-summary.png", fullPage: true });
  75  |   });
  76  | 
  77  |   test("Calendar shows AI Import button and modal", async ({ page }) => {
  78  |     await loginAsAdmin(page);
  79  |     await page.goto("/kalender");
  80  |     await page.waitForLoadState("networkidle");
  81  |     await page.waitForTimeout(2000);
  82  | 
  83  |     const aiBtn = page.locator('[data-testid="ai-import-plan-btn"]');
  84  |     await expect(aiBtn).toBeVisible();
  85  | 
  86  |     // Open modal
  87  |     await aiBtn.click();
  88  |     await page.waitForTimeout(500);
  89  |     await expect(page.locator('[data-testid="ai-plan-import-modal"]')).toBeVisible();
  90  | 
  91  |     await page.screenshot({ path: "test-results/calendar-ai-import-modal.png", fullPage: true });
  92  |   });
  93  | 
  94  |   test("Coach Triage page loads", async ({ page }) => {
  95  |     await loginAsAdmin(page);
  96  |     await page.goto("/coach-triage");
  97  |     await page.waitForLoadState("networkidle");
  98  |     await page.waitForTimeout(2000);
  99  | 
  100 |     await expect(page.locator('[data-testid="coach-triage-page"]')).toBeVisible({ timeout: 10_000 });
  101 |     await expect(page.locator('[data-testid="coach-triage"]')).toBeVisible();
  102 | 
  103 |     await page.screenshot({ path: "test-results/coach-triage-page.png", fullPage: true });
  104 |   });
  105 | 
  106 |   test("Sidebar shows Coach Triage link", async ({ page }) => {
  107 |     await loginAsAdmin(page);
  108 |     await page.waitForTimeout(1000);
  109 | 
  110 |     // Coach Triage should be in the sidebar
  111 |     const link = page.getByText("Coach Triage");
  112 |     await expect(link).toBeVisible({ timeout: 10_000 });
  113 | 
  114 |     await page.screenshot({ path: "test-results/sidebar-coach-triage.png" });
  115 |   });
  116 | });
  117 | 
```