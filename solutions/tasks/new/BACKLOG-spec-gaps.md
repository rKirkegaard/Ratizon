# Backlog: Manglende opgaver fra spec-filer

Audit dato: 2026-04-08
Sidst opdateret: 2026-04-08

## KRITISK (skal fikses)

### 1. Top bar athlete badge viser forkert navn
- **Status:** ✅ FIKSET — Badge viser nu selectedAthleteName fra profil-fetch
- **Fikset i:** `src/presentation/layouts/AppLayout.tsx`

### 2. EquipmentSplitModal validering virker men mangler integration test
- **Status:** ✅ FIKSET — Integration test bestaaet med reel session-data (11 laps, Opdel-knap synlig)
- **Test:** `tests/equipment-split.spec.ts`

### 3. SessionEquipmentSection mangler laps/distance/duration props fra SessionAnalysisPage
- **Status:** ✅ FIKSET — Props sendes nu korrekt inkl. laps-mapping
- **Fikset i:** `src/presentation/pages/SessionAnalysisPage.tsx`

## MEDIUM (bør fikses)

### 4. LLM preset buttons bruger cents-værdier men viser dollars korrekt
- **Status:** ✅ Ikke et problem — formatCents() konverterer korrekt

### 5. Profilbillede upload bruger base64 JSON i stedet for FormData
- **Status:** ✅ Virker fint — base64 JSON er simplere og fungerer

### 6. Equipment kategori-konstanter er duplikeret i flere filer
- **Status:** ✅ FIKSET — Centraliseret i `src/domain/constants/equipmentCategories.ts`

### 7. Admin LLM Config er inline i edit-dialog + separat dialog
- **Status:** ✅ Begge eksisterer som spec kraever

## LAV PRIORITET

### 8. Sidebar collapse-knap er inde i header (spec siger udenfor)
- **Status:** Accepteret — minor UI forskel, virker fint

### 9. Route-paths matcher ikke spec præcist
- **Status:** Accepteret — Ratizon bruger danske paths, bevidst valg

---

## ALLE OPGAVER LUKKET
Ingen aabne opgaver.
