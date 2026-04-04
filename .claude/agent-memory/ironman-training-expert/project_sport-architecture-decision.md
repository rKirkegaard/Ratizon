---
name: Sport-type arkitektur beslutning
description: Beslutning om at udvide hardkodede swim/bike/run til dynamisk SportType-system med 6 sportsgrene og SportConfig registry-pattern
type: project
---

Besluttet 2026-04-02 at refaktorere sport-arkitekturen fra hardkodet swim/bike/run til dynamisk SportType-system.

**Beslutning:**
- SportType = "swim" | "bike" | "run" | "strength" | "yoga" | "other"
- SportConfig registry-pattern med metadata per sport (label, icon, color, capabilities)
- Navigation dynamisk baseret paa atletens activeDisciplines
- DisciplineSplit og WeeklyBudget aendres fra navngivne felter til Record<SportType, number>
- Styrke er foersteklasses borger (pre-selected for triatleter)
- Kun swim/bike/run faar dedikerede analyse-sider i MVP
- Strength/yoga/other logger sessioner men ingen dybe analyse-sider i MVP

**Why:** Platformen skal kunne understotte rene loebere, cyklister, triatleter og atleter med styrke/yoga. Hardkodede discipliner skalerer ikke og kraever kodeaendringer for hver ny sport.

**How to apply:** Alle nye features skal bruge SportConfig-registret i stedet for hardkodede sport-checks. Navigation, farver, metrikker og zone-modeller drives af SportConfig.

Faser: 
1. Udvid types + SportConfig + CSS + dynamisk nav
2. Onboarding-flow + disciplin-toggle + dynamisk DisciplineSplit
3. Styrke-specifik session-model + konfigurerbare farver

Paavirket kode: athlete.types.ts, sport-colors.ts, planning.types.ts, equipment.types.ts, AppLayout.tsx, routes.tsx
