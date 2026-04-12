# Ratizon — Claude Code Instruktioner

## Arbejdsproces — ALTID foelg denne raekkefoelge

1. **Laes og forstaa** den eksisterende kode, datamodel og moenstre FOER du aendrer noget
2. **Konsulter agenter** foer implementering:
   - `solution-architect` for datamodel-aendringer, nye endpoints, schema-design
   - `ui-ux-designer` for frontend-aendringer, nye komponenter, layout
   - `ironman-training-expert` (eller relevant domaene-ekspert) for domaenelogik og formler
3. **Verificer konsistens** — nye felter/vaerdier SKAL matche eksisterende data og moenstre
4. **Test med eksisterende data** — tjek at eksisterende data stadig vises korrekt efter aendringer
5. **Goer kun det der er bedt om** — udvid ikke scope, fjern ikke funktionalitet

### Hvad IKKE at goere
- Opret IKKE nye tabeller/kolonner uden solution-architect review
- AEndr IKKE eksisterende komponenters opfoersel uden at forstaa alle steder de bruges
- Erstat IKKE eksisterende UI-mekanismer (fx kalendervaelger) bare fordi et underliggende problem skal loeses
- Antag IKKE at noget "er fint for nu" — implementer korrekt foerste gang

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

## Dato og kalender
- Datoformat er ALTID dansk: **d. måned åååå** (dag foerst, IKKE mm/dd/yyyy)
- Ugen starter ALTID med **mandag** og slutter med **soendag** (ISO 8601)
- Brug ALTID `DatePicker` fra `@/presentation/components/shared/DatePicker` til datovalg — den er defineret som standard i systemindstillinger (App & Zoner)
- Brug IKKE `<input type="date">` — det bruger OS-locale og viser forkert format
- Alle dato-beregninger (uge-start, ISO-uge) skal bruge UTC-baserede funktioner for at undgaa timezone-drift
- `date-fns` med `da` locale er standard for datoformatering

## API
- `apiClient` auto-unwrapper `{data: ...}` responses
- Backend wrapper ALTID responses i `{data: ...}`
- Pace gemmes som M:SS streng (f.eks. "4:15"), IKKE som sekunder
