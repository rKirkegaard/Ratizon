# Ratizon — Claude Code Instruktioner

## Arkitekturregler

### Beregningsfunktioner skal ALTID centraliseres
- Opret ALDRIG en ny beregningsfunktion hvis den allerede eksisterer centralt
- Alle beregninger (TSS, varighed, distance, pace-parsing) skal ligge i `src/domain/utils/`
- Komponenter kalder centrale funktioner — de laver ALDRIG deres egne beregninger inline

### Centrale beregningsfiler
| Fil | Ansvar |
|-----|--------|
| `src/domain/utils/paceUtils.ts` | Pace parsing (M:SS ↔ sekunder). ENESTE sted for pace-konvertering |
| `src/domain/utils/tssCalculator.ts` | Lav-niveau TSS/varighed/distance beregning fra sessionsblokke |
| `src/domain/utils/sessionMetrics.ts` | `calcPlannedSessionMetrics()` — DEN ENE funktion alle komponenter kalder for planlagte sessioner |
| `src/domain/constants/equipmentCategories.ts` | Udstyrs-kategorier, sport-mapping, levetidsstatus |
| `src/domain/constants/llmProviders.ts` | LLM provider/model-lister |

### Regler for nye beregninger
1. Tjek ALTID om funktionen allerede eksisterer i `src/domain/utils/` foer du opretter en ny
2. Hvis den ikke eksisterer, opret den i den relevante utils-fil — IKKE i komponenten
3. Komponenter importerer fra utils — de har ALDRIG lokale beregningsfunktioner
4. Backend har sin egen kopi i `backend/src/domain/utils/` (kan ikke dele med frontend)

### Konsistens
- Samme vaerdi (TSS, varighed, distance) skal vise det SAMME tal overalt i UI'et
- Brug `calcPlannedSessionMetrics(session, thresholdPace)` for alle planlagte sessioner
- Send ALTID atletens threshold-pace naar den er tilgaengelig

## Tech stack
- React 18 + TypeScript + Vite + Tailwind CSS (dark theme)
- Express 5 + Drizzle ORM + PostgreSQL
- TanStack Query, Zustand, Recharts
- @dnd-kit for drag-and-drop
- All UI tekst paa dansk, kode paa engelsk
- data-testid paa alle interaktive elementer
- Ingen shadcn/ui — plain HTML + Tailwind

## API
- `apiClient` auto-unwrapper `{data: ...}` responses
- Backend wrapper ALTID responses i `{data: ...}`
- Pace gemmes som M:SS streng (f.eks. "4:15"), IKKE som sekunder
