# LLM Integration — Backlog

## Status
- **Aktuel fase:** Fase 1 — Kerne-infrastruktur
- **Sidst opdateret:** 16. april 2026

---

## Fase 1: Kerne-infrastruktur

### P1-01: Udvid llm.schema.ts med manglende kolonner
- **Status:** DONE
- **Filer:** `backend/src/infrastructure/database/schema/llm.schema.ts`
- **Beskrivelse:** Tilføj `defaultTrainingDataRange` til `llmSettings`. Tilføj `inheritApiKey`, `inheritProvider`, `inheritModel`, `inheritContext`, `trainingDataRange` til `athleteLlmPreferences`.
- **Blokerer:** P1-03, P1-04, P1-10

### P1-02: Tilføj athleteId til chatMessages (valgfri)
- **Status:** PENDING
- **Filer:** `backend/src/infrastructure/database/schema/ai-coaching.schema.ts`
- **Beskrivelse:** Tilføj `athleteId` direkte på `chatMessages` for hurtigere per-atlet queries.
- **Blokerer:** P1-10

### P1-03: Opret LLMPreferencesService
- **Status:** DONE
- **Filer:** `backend/src/domain/services/LLMPreferencesService.ts` (ny)
- **Beskrivelse:** Ekstraher preference-logik fra controller. Funktioner: getSystemSettings, updateSystemSettings, getAthletePreferences, upsertAthletePreferences, deleteAthletePreferences, encrypt/decrypt API keys.
- **Blokeret af:** P1-01

### P1-04: Opret EffectiveLLMService
- **Status:** DONE
- **Filer:** `backend/src/domain/services/EffectiveLLMService.ts` (ny)
- **Beskrivelse:** Arveopløsning: system → atlet. Funktion: getEffectiveConfig(athleteId) → provider, model, apiKey, systemContext, trainingDataRange, budget.
- **Blokeret af:** P1-01, P1-03

### P1-05: Opdater LLMPricingService med manglende modeller
- **Status:** DONE
- **Filer:** `backend/src/domain/services/LLMPricingService.ts`
- **Beskrivelse:** Tilføj Google Gemini og Mistral modeller til pricing map. Aligner med frontend `llmProviders.ts`.
- **Blokerer:** Ingen

### P1-06: Refaktorér llm-settings.controller.ts til service-lag
- **Status:** DONE
- **Filer:** `backend/src/application/controllers/llm-settings.controller.ts`
- **Beskrivelse:** Erstat inline DB-queries med kald til LLMPreferencesService og EffectiveLLMService. Tilføj getEffectivePreferences handler.
- **Blokeret af:** P1-03, P1-04

### P1-07: Tilføj /effective route
- **Status:** DONE
- **Filer:** `backend/src/application/routes/llm-settings.routes.ts`
- **Beskrivelse:** Tilføj `GET /preferences/:athleteId/effective` og `DELETE /preferences/:athleteId`.
- **Blokeret af:** P1-06

### P1-08: Opdater LLMClient med atlet-baseret provider-opløsning
- **Status:** DONE
- **Filer:** `backend/src/infrastructure/llm/LLMClient.ts`
- **Beskrivelse:** Tilføj `resolveForAthlete(athleteId)` der bruger EffectiveLLMService. Bevar fallback til env vars.
- **Blokeret af:** P1-04

### P1-09: Opdater frontend typer og hooks
- **Status:** DONE
- **Filer:** `src/application/hooks/llm/useLLMSettings.ts`
- **Beskrivelse:** Tilføj `LLMEffectiveConfig` interface og `useLLMEffectiveConfig` hook. Opdater `LLMAthletePreferences` med nye arv-felter.
- **Blokeret af:** P1-07

### P1-10: Kør database-migration
- **Status:** DONE
- **Beskrivelse:** Generer og kør Drizzle migration for schema-ændringer fra P1-01 og P1-02.
- **Blokeret af:** P1-01, P1-02

---

## Fase 2: Chat & konfiguration
_Opgaver oprettes når Fase 1 er færdig._

## Fase 3: AI-analyse & anbefalinger
_Opgaver oprettes når Fase 2 er færdig._

## Fase 4-8: Se spec sektion 29.
