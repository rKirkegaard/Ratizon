# LLM/AI Integration — Komplet Specifikation

Denne spec beskriver den fulde AI/LLM-integration fra ironcoach20260128, som skal implementeres i Ratizon. Specifikationen dækker alle aspekter: chat, konfiguration, datakontekst, anbefalinger, token-tracking og AI-genererede resuméer.

---

## 1. AI Chat Interface

### Formål
Multi-turn samtale med en AI-coach specialiseret i triatlon og udholdenhedstræning. Brugeren kan stille spørgsmål om træning, ernæring, restitution og teknik. AI'en har kontekst om atletens aktuelle data.

### Brugeroplevelse
- Samtaler organiseret i separate tråde (som ChatGPT)
- Beskedhistorik persisteret og genindlæsbar
- Samtaletitel auto-genereret fra første brugerbesked
- Realtidsvisning af AI-svar
- Kontekstbevidste svar baseret på atletens træningsdata

### Frontend-komponenter
- **AIChatTab** — Hovedchat-UI med beskedinput, beskedhistorik, samtaleliste, typing-indikator
- **CoachAssistant-side** — Wrapper-side der kombinerer chat + coach inbox

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| POST | `/api/ai/chat/:athleteId` | Send besked, modtag AI-svar |

### Request-format
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "provider": "openai|anthropic",
  "model": "gpt-4o-mini",
  "athleteContext": "...",
  "athleteDataFile": { ... }
}
```

### Response-format
```json
{
  "content": "AI-svar...",
  "provider": "openai",
  "model": "gpt-4o-mini"
}
```

### Understøttede providers
- **OpenAI**: Chat Completions API + Responses API (fil-upload)
- **Anthropic**: Messages API
- **Ollama**: Lokal LLM (llama3.2 m.fl.)

---

## 2. Samtalepersistering

### Database-tabeller

**chat_conversations**
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| conversation_id | UUID PK | Unik samtale-ID |
| athlete_id | UUID FK | Reference til atlet |
| title | VARCHAR(200) | Samtaletitel (auto fra første besked) |
| created_at | TIMESTAMP | Oprettelsestidspunkt |
| updated_at | TIMESTAMP | Senest opdateret |

**chat_messages**
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | UUID PK | Besked-ID |
| athlete_id | UUID FK | Reference til atlet |
| conversation_id | UUID FK | Reference til samtale |
| role | VARCHAR(20) | 'user' eller 'assistant' |
| content | TEXT | Beskedindhold |
| created_at | TIMESTAMP | Tidspunkt |

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/api/chat-messages/conversations/:athleteId` | Liste samtaler |
| POST | `/api/chat-messages/conversations/:athleteId` | Opret samtale |
| PUT | `/api/chat-messages/conversations/:conversationId` | Opdater titel |
| DELETE | `/api/chat-messages/conversations/:conversationId` | Slet samtale + beskeder |
| GET | `/api/chat-messages/conversation/:conversationId/messages` | Hent beskeder |
| POST | `/api/chat-messages/conversation/:conversationId/messages` | Tilføj besked |
| DELETE | `/api/chat-messages/message/:messageId` | Slet enkelt besked |

### Adfærd
- Første brugerbesked truncates til 50 tegn og bliver samtaletitel
- `updated_at` opdateres ved hver ny besked
- Kaskade-sletning: sletning af samtale sletter alle beskeder

---

## 3. LLM-konfiguration

### Konfigurationsniveauer

**System-niveau** (singleton)
- Standard-provider, model, data-range, API-nøgler, system-kontekst
- Kun redigerbar af admin
- Bruges som fallback

**Atlet-niveau** (per-atlet override)
- Valgfri overrides med arv fra system
- Granulær arv: provider, model, API-nøgle, kontekst kan arves individuelt

### Database-tabeller

**system_llm_settings**
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| setting_id | UUID PK | |
| setting_key | VARCHAR UNIQUE | |
| default_provider | VARCHAR | 'openai' eller 'anthropic' |
| default_model | VARCHAR | fx 'gpt-4o-mini' |
| openai_encrypted_key | TEXT | AES-256-CBC krypteret |
| openai_iv | TEXT | Initialiseringsvektor |
| anthropic_encrypted_key | TEXT | AES-256-CBC krypteret |
| anthropic_iv | TEXT | Initialiseringsvektor |
| default_training_data_range | VARCHAR | 'single', '1week', '2weeks', '3weeks', '4weeks' |
| global_monthly_token_budget | INT | I cents, NULL = ubegrænset |
| default_system_context | TEXT | Standard system prompt |

**athlete_llm_preferences**
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| preference_id | UUID PK | |
| athlete_id | UUID FK UNIQUE | |
| inherit_from_system | BOOLEAN | Master-switch for arv |
| inherit_api_key | BOOLEAN | Arv API-nøgle |
| inherit_provider | BOOLEAN | Arv provider |
| inherit_model | BOOLEAN | Arv model |
| inherit_context | BOOLEAN | Arv system-kontekst |
| preferred_provider | VARCHAR | 'openai' eller 'anthropic' |
| preferred_model | VARCHAR(50) | Model-ID |
| custom_system_context | TEXT | Op til 50KB |
| training_data_range | VARCHAR | Dataudvalg for kontekst |
| monthly_token_budget | INT | I cents, NULL = ubegrænset |

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/api/athletes/:athleteId/llm-preferences` | Hent præferencer |
| GET | `/api/athletes/:athleteId/llm-preferences/effective` | Hent opløste præferencer (efter arv) |
| PUT | `/api/athletes/:athleteId/llm-preferences` | Opret/opdater |
| DELETE | `/api/athletes/:athleteId/llm-preferences` | Nulstil til system-default |
| GET | `/api/llm-settings/system` | System-indstillinger (offentlig, ikke-sensitiv) |

### Tilgængelige modeller
**OpenAI:** gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo, o1, o3, o4-mini
**Anthropic:** claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus, claude-4-5
**Lokal:** Ollama (llama3.2, llama3.1, gemma2 m.fl.)

---

## 4. Træningsdata-kontekst

### Formål
Automatisk inkludere atletens relevante data i LLM-konteksten, så AI'en kan give personlige svar.

### Konfigurerbar data-range
| Værdi | Beskrivelse |
|-------|-------------|
| single | Kun aktuel session |
| 1week | Sidste 7 dage |
| 2weeks | Sidste 14 dage (default) |
| 3weeks | Sidste 21 dage |
| 4weeks | Sidste 28 dage |

### Kontekst-format (sendes som system prompt)
```
TRÆNINGSFILOSOFI: [philosophy]

Atlet Information:
- Navn: [first_name last_name]
- Max Puls: [hrmax]
- Hvile Puls: [resting_hr]
- FTP (Watt): [ftp_w]
- Løb Threshold Pace: [mm:ss min/km]
- CSS (Svøm): [mm:ss /100m]
- Højde: [height_cm] cm
- Vægt: [weight_kg] kg
- Race Dato: [target_race_date]

Seneste Træningssessioner:
[sport, distance, duration, avg HR, zone, date per session — max 20]
```

### Datahentning
- Atletprofil fra `athletes`-tabel
- Seneste sessioner fra `sessions`-tabel (TOP 20 inden for data-range)
- Aktuel træningsplan fra `plans`-tabel
- Mål og race-dato fra `goals`-tabel

---

## 5. Coach Inbox / AI-anbefalinger

### Formål
AI-genererede anbefalinger vises i en "Coach Inbox" med accept/afvis-workflow og kalenderintegration.

### Brugeroplevelse
- Anbefalinger vises med titel, beskrivelse, prioritet, sport, tidspunkt
- Bruger kan acceptere (tilføj til kalender), afvise (med begrundelse), eller markere som implementeret
- Prioritetsniveauer: low, medium, high, critical
- Begrundelse for anbefalingen vises

### Database-tabel: recommendations
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| recommendation_id | BIGINT PK | |
| athlete_id | UUID FK | |
| category | VARCHAR(50) | 'training', 'recovery', 'nutrition' |
| priority | VARCHAR(10) | 'low', 'medium', 'high', 'critical' |
| title | VARCHAR(200) | |
| description | TEXT | |
| reasoning | TEXT | Begrundelse for anbefalingen |
| status | VARCHAR(20) | 'pending', 'accepted', 'rejected', 'implemented', 'expired' |
| generated_by | VARCHAR(50) | 'ai', 'coach', 'system' |
| expires_at | TIMESTAMP | Auto-udløb |
| accepted_at | TIMESTAMP | |
| implemented_at | TIMESTAMP | |
| rejection_reason | VARCHAR(500) | |
| implementation_notes | VARCHAR(1000) | |
| sport | VARCHAR | Sport-type |
| scheduled_date | DATE | Planlagt dato |
| training_type | VARCHAR | Træningstype |
| duration_minutes | INT | Varighed |
| tss | INT | Estimeret TSS |

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/api/recommendations/athlete/:athleteId` | Hent anbefalinger (sorteret: critical > high > medium > low) |
| POST | `/api/recommendations` | Opret anbefaling |
| PUT | `/api/recommendations/:id` | Opdater |
| POST | `/api/recommendations/:id/accept` | Accepter → status 'accepted' |
| POST | `/api/recommendations/:id/reject` | Afvis → status 'rejected' + rejection_reason |
| POST | `/api/recommendations/:id/implement` | Implementer → status 'implemented' |
| DELETE | `/api/recommendations/:id` | Slet |

### Workflow
1. AI/system opretter anbefaling med status 'pending'
2. Bruger ser i Coach Inbox
3. Bruger accepterer → status 'accepted', kan importeres som PlannedSession
4. Bruger implementerer → status 'implemented'
5. Eller afviser → status 'rejected' med valgfri begrundelse

### Kalenderintegration
Ved accept kan anbefalingen auto-importeres som planlagt session med:
sport, scheduled_date, training_type, duration_minutes, tss, title, description

---

## 6. Token Usage Tracking & Omkostningsstyring

### Formål
Automatisk logning af alle LLM-kald med token-tællinger og omkostningsberegning. Månedlige grænser håndhæves.

### Database-tabel: llm_usage
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| usage_id | BIGINT PK | |
| athlete_id | UUID FK | |
| request_timestamp | TIMESTAMP | |
| model_provider | VARCHAR(20) | 'openai' eller 'anthropic' |
| model_name | VARCHAR(50) | |
| input_tokens | INT | |
| output_tokens | INT | |
| total_tokens | INT | |
| cost_usd | DECIMAL(10,6) | |
| request_type | VARCHAR(20) | 'chat', 'analysis', 'planning', 'recommendation' |
| session_id | VARCHAR | Valgfri reference |
| metadata | JSONB | |

### Prisberegning (per 1000 tokens)
**OpenAI:**
- gpt-4o: $0.005 input, $0.015 output
- gpt-4o-mini: $0.00015 input, $0.0006 output
- gpt-4-turbo: $0.01 input, $0.03 output

**Anthropic:**
- claude-3-5-sonnet: $0.003 input, $0.015 output
- claude-3-5-haiku: $0.00025 input, $0.00125 output
- claude-3-opus: $0.015 input, $0.075 output

### Månedlig grænse-håndhævelse
- Tjekkes FØR hvert LLM-kald
- Returnerer 403 Forbidden med omkostningsdetaljer hvis overskredet
- Grænse gemt som int (cents) i `athlete_llm_preferences.monthly_token_budget`

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/api/llm-usage/athlete/:athleteId` | Aggregeret statistik |
| GET | `/api/llm-usage/athlete/:athleteId/daily?days=30` | Daglig historik |
| GET | `/api/llm-usage/athlete/:athleteId/monthly?months=12` | Månedlig historik |
| GET | `/api/llm-usage/athlete/:athleteId/limit-status` | Aktuel månedsstatus |

### Frontend-komponenter
- **AthleteLLMLimits** — Vis/sæt månedlig grænse med progress bar og preset-knapper ($1/$5/$10/$25/$50/Ubegrænset)
- **LLMUsageStats** — Daglig/månedlig forbrugsgraf, omkostning per model

---

## 7. AI-genererede Resuméer

### Formål
AI-analyse af individuelle sessioner, uger og måneder.

### Typer
| Type | Endpoint | Beskrivelse |
|------|----------|-------------|
| Session | `POST /api/analytics/session/:sessionId/ai-summary` | Analyserer enkelt session |
| Uge | `POST /api/analytics/weekly/:athleteId/ai-summary?date=YYYY-MM-DD` | Analyserer ugens data |
| Måned | `POST /api/analytics/monthly/:athleteId/ai-summary?year=&month=` | Analyserer månedens data |

### Response
```json
{
  "summary": "Markdown-formateret AI-analyse...",
  "tokenCount": 1234
}
```

### Frontend-komponent: AISummary
- "Generer"-knap trigger backend-request
- Loading spinner under generering
- Viser resumé som markdown
- Token-tæller vist
- Genindlæsnings-knap
- Respekterer månedlig budget

---

## 8. AI-genererede Træningsplaner & Import

### Formål
Generering af strukturerede træningsplaner via LLM, med direkte import til Ratizons planlagte sessioner (`planned_sessions`-tabel).

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| POST | `/api/ai/generate-plan/:athleteId` | Generer plan via LLM |
| GET | `/api/ai/models` | Liste tilgængelige modeller (Ollama) |

### Request
```json
{
  "model": "llama3.2",
  "customPrompt": "...",
  "weeks": 4,
  "startDate": "2026-04-20"
}
```

### LLM Output → Ratizon PlannedSession Mapping
AI'en genererer struktureret tekst/JSON der parses og mappes til Ratizons `planned_sessions`-tabel:

| AI Output Felt | Ratizon Kolonne | Beskrivelse |
|----------------|-----------------|-------------|
| sport | `sport` | 'swim', 'bike', 'run' |
| date | `scheduled_date` | Beregnet fra uge + dag + startDate |
| type/purpose | `session_purpose` | 'endurance', 'tempo', 'threshold', 'vo2max', 'recovery', 'interval' |
| title | `title` | Genereret titel fx "Tempo cykel - Z3" |
| description | `description` | Fuld beskrivelse af sessionen |
| duration | `target_duration_seconds` | Konverteret fra minutter til sekunder |
| distance | `target_distance_meters` | Afledt fra pace × tid hvis muligt |
| tss | `target_tss` | Estimeret fra varighed × intensitetsmultiplikator |
| zones | `target_zones` | JSONB med HR/power zone targets |
| warmup/main/cooldown | `session_blocks` | JSONB med strukturerede blokke |
| - | `ai_generated` | Sættes til `true` |

### Session Blocks Format (JSONB)
```json
[
  {
    "type": "warmup",
    "duration_seconds": 600,
    "description": "Let opvarmning",
    "target_hr_zone": 1
  },
  {
    "type": "interval",
    "duration_seconds": 300,
    "repeat_count": 5,
    "rest_seconds": 120,
    "target_hr_zone": 4,
    "description": "5x5min i Z4 med 2min pause"
  },
  {
    "type": "cooldown",
    "duration_seconds": 600,
    "description": "Rolig nedkøling",
    "target_hr_zone": 1
  }
]
```

### AI Training Parser (Frontend Utility)
Placering: `src/domain/utils/aiTrainingParser.ts`

Parser AI-genereret tekst (dansk/engelsk) til strukturerede sessioner:
- **Detekterer:** Ugenumre, dagnavne (mandag-søndag), sportsgrene, varigheder
- **Normaliserer:** Sport-navne (svømning→swim, cykling→bike, løb→run)
- **Beregner:** TSS fra varighed × intensitetsmultiplikator (recovery=0.3, easy=0.5, moderate=0.7, hard=1.0, max=1.3)
- **Understøtter:** Både JSON og fritekst-format fra LLM
- **Output:** Array af `PlannedSession`-objekter klar til bulk-import

### AI Training Import Komponent
Placering: `src/presentation/components/planning/AITrainingImport.tsx`

- Tekstområde hvor bruger kan paste AI-genereret plan
- "Parse & Importér"-knap
- Preview af parsede sessioner før import
- Bekræftelsesdialog med antal sessioner og datointerval
- Bulk-import til `planned_sessions` via eksisterende `POST /api/planning/:athleteId/sessions` endpoint
- Alle importerede sessioner markeres med `ai_generated: true`

### Integration med Kalender
- AI-importerede sessioner vises i kalenderen med en AI-badge
- Kan redigeres, flyttes (drag-and-drop) og slettes som normale planlagte sessioner
- `ai_generated`-flag bevares så brugeren kan se hvilke sessioner der er AI-genererede

### Chat → Plan Workflow
1. Bruger beder AI'en i chatten om en træningsplan
2. AI returnerer struktureret plan-tekst
3. Bruger kopierer teksten eller klikker "Importér til kalender"
4. Parser konverterer til planlagte sessioner
5. Sessioner importeres og vises i kalenderen

---

## 9. System Prompts

### Basis system prompt (chat)
```
Du er en ekspert træningscoach specialiseret i udholdenhedstræning,
triathlon, løb, cykling og svømning.

Du kan hjælpe med:
- Generering af træningsplaner
- Analyse af træningsdata
- Rådgivning om restitution, ernæring og mental træning
- Forklaring af træningsteknikker

Svar altid på dansk.
```

### Konfigurerbarhed
- **System-niveau:** Gemt i `system_llm_settings.default_system_context`
- **Atlet-niveau:** Gemt i `athlete_llm_preferences.custom_system_context` (op til 50KB)
- Atletens kontekst (profil + sessioner) tilføjes automatisk

---

## 10. AI Alerts & Alert Rules

### Formål
Automatisk generering af advarsler baseret på atletens træningsdata: overtræning, skaderisiko, plateau, undertraining, milestones.

### Database-tabeller

**ai_alerts**
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | UUID PK | |
| athlete_id | UUID FK | |
| rule_id | UUID FK NULL | Reference til den regel der udløste alarmen |
| alert_type | VARCHAR | 'overtraining', 'undertraining', 'injury_risk', 'plateau', 'milestone', 'custom' |
| severity | VARCHAR | 'info', 'warning', 'critical' |
| title | VARCHAR | Kort titel |
| message | TEXT | Detaljeret besked |
| acknowledged | BOOLEAN | Om atleten har set alarmen |
| created_at | TIMESTAMP | |

**alert_rules**
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | UUID PK | |
| athlete_id | UUID FK | |
| rule_name | VARCHAR | Beskrivende navn |
| rule_type | VARCHAR | Type af regel |
| thresholds | JSONB | Tærskler og parametre for reglen |
| enabled | BOOLEAN | Om reglen er aktiv |
| created_at | TIMESTAMP | |

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/api/ai-coaching/:athleteId/alerts` | Hent ubekræftede alerts (max 20) |
| POST | `/api/ai-coaching/:athleteId/alerts/:id/acknowledge` | Bekræft alert |
| GET | `/api/ai-coaching/:athleteId/alert-rules` | Hent atletens regler |
| POST | `/api/ai-coaching/:athleteId/alert-rules` | Opret regel |
| PUT | `/api/ai-coaching/:athleteId/alert-rules/:id` | Opdater regel |
| DELETE | `/api/ai-coaching/:athleteId/alert-rules/:id` | Slet regel |

### Automatisk alert-generering
Baggrundsjob der evaluerer regler periodisk:
- **Overtræning**: TSB < -30 i mere end 3 dage → critical
- **Skaderisiko**: Ramp rate > 10% uge-over-uge → warning
- **Plateau**: CTL uændret (±2) i 3+ uger → info
- **Undertræning**: Ingen sessioner i 5+ dage → warning
- **Milestone**: CTL all-time high, PR'er → info

### Frontend-integration
- Alerts vises i Dashboard (CoachInbox-komponent)
- Badge-tæller i sidebar navigation
- Farvekodning: info=blå, warning=amber, critical=rød

---

## 11. AI Coaching Preferences

### Formål
Per-atlet konfiguration af AI-coachens adfærd og kommunikationsstil.

### Database-tabel: ai_coaching_preferences
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | UUID PK | |
| athlete_id | UUID FK UNIQUE | |
| communication_style | VARCHAR | 'concise', 'detailed', 'motivational' |
| language | VARCHAR | 'da', 'en' |
| focus_areas | JSONB | Array af fokusområder (fx ['endurance', 'speed', 'recovery']) |
| auto_suggestions | BOOLEAN | Automatiske forslag aktiveret |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/api/ai-coaching/:athleteId/preferences` | Hent præferencer |
| PUT | `/api/ai-coaching/:athleteId/preferences` | Opdater præferencer |

### Integration
- Kommunikationsstil påvirker system prompt (concise = korte svar, detailed = lange forklaringer, motivational = opmuntrende tone)
- Focus areas styrer hvilke emner AI'en prioriterer
- Auto-suggestions bestemmer om AI'en proaktivt genererer anbefalinger

---

## 12. AI Suggestion Logging

### Formål
Sporing af AI-forslag og atletens reaktion — bruges til at forbedre fremtidige anbefalinger.

### Database-tabel: ai_suggestion_log
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | UUID PK | |
| athlete_id | UUID FK | |
| suggestion_type | VARCHAR | Type af forslag |
| suggestion | TEXT | Forslagets indhold |
| accepted | BOOLEAN NULL | Om atleten accepterede (NULL = ikke reageret) |
| feedback | TEXT NULL | Atletens feedback på forslaget |
| created_at | TIMESTAMP | |

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| POST | `/api/ai-coaching/:athleteId/suggestions/log` | Log et forslag |
| POST | `/api/ai-coaching/:athleteId/suggestions/:id/feedback` | Registrer feedback |
| GET | `/api/ai-coaching/:athleteId/suggestions` | Hent forslagshistorik |

---

## 13. Coach Notes

### Formål
Trænere kan tilknytte noter til sessioner og atleter — private eller delte med atleten.

### Database-tabel: coach_notes
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | UUID PK | |
| coach_id | UUID FK | Reference til træneren |
| athlete_id | UUID FK | Reference til atleten |
| session_id | UUID FK NULL | Valgfri reference til specifik session |
| content | TEXT | Note-indhold |
| visibility | VARCHAR | 'private' (kun coach) eller 'shared' (coach + atlet) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Backend-endpoints
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/api/coach-notes/athlete/:athleteId` | Hent noter for atlet |
| GET | `/api/coach-notes/session/:sessionId` | Hent noter for session |
| POST | `/api/coach-notes` | Opret note |
| PUT | `/api/coach-notes/:id` | Opdater note |
| DELETE | `/api/coach-notes/:id` | Slet note |

### Frontend-integration
- Noter vises i session-detaljer (SessionAnalysis-komponent)
- Coach ser alle noter, atlet ser kun 'shared'
- Ikon-indikator på sessioner der har noter

---

## 14. Daily Briefing

### Formål
Auto-genereret daglig briefing der sammenfatter atletens aktuelle status og giver anbefalinger for dagens træning.

### Indhold
- **Wellness-status**: Søvn, HRV, humør, motivation fra seneste wellness-log
- **PMC-status**: CTL, ATL, TSB med fortolkning (frisk/træt/overtrænet)
- **Gårsdagens sessioner**: Opsummering af gennemført træning
- **Dagens plan**: Planlagte sessioner for i dag
- **Anbefalinger**: Justeringer baseret på form og restitution

### Adfærd
- Auto-genereres ved første visning af dashboard hvis ingen briefing for i dag
- Caches for resten af dagen
- Kan manuelt genindlæses

### Backend-endpoint
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/api/ai-coaching/:athleteId/daily-briefing` | Hent (eller generer) dagens briefing |

### Database-tabel: ai_daily_briefings
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | UUID PK | |
| athlete_id | UUID FK | |
| briefing_date | DATE | Dato for briefing |
| content | TEXT | Markdown-formateret briefing |
| wellness_snapshot | JSONB | Wellness-data brugt til generering |
| pmc_snapshot | JSONB | PMC-data brugt til generering |
| created_at | TIMESTAMP | |

---

## 15. Session Feedback med Dyb Analytics

### Formål
AI-drevet analyse af individuelle sessioner med avancerede metrics og sammenligning med lignende sessioner.

### Analyse-metrics
| Metric | Beskrivelse |
|--------|-------------|
| Zone-fordeling | Tid i Z1-Z5 (sekunder + procent) |
| Efficiency Factor (EF) | NP/avgHR — aerob effektivitet |
| Decoupling | HR-drift over session — aerob udholdenhed |
| Intensity Factor (IF) | NP/FTP — relativ intensitet |
| Variability Index (VI) | NP/avgPower — pacing jævnhed |
| TRIMP | Training Impulse — pulsbaseret belastning |
| HRSS | Heart Rate Stress Score — pulsbaseret TSS |

### Sammenligning
- Henter de 5 seneste lignende sessioner (samme sport, lignende varighed)
- Sammenligner: pace/power progression, HR-drift, EF-trend
- Identificerer forbedringer eller tilbagegang

### Backend-endpoint
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| POST | `/api/ai-coaching/:athleteId/session-feedback/:sessionId` | Generer AI-feedback med analytics |

### Response
```json
{
  "feedback": "Markdown-formateret analyse...",
  "analytics": {
    "zoneDistribution": { "z1": 1200, "z2": 2400, ... },
    "ef": 1.85,
    "decoupling": 3.2,
    "intensityFactor": 0.78,
    "variabilityIndex": 1.03,
    "trimp": 85,
    "hrss": 92
  },
  "comparison": {
    "recentSimilar": 5,
    "trend": "improving"
  }
}
```

---

## 16. Kryptering & Sikkerhed

### API-nøgle kryptering
- AES-256-CBC med `API_ENCRYPTION_KEY` fra environment
- Separate IV per nøgle
- Dekryptering kun ved brug
- Nøgler aldrig logget eller eksponeret i responses

### Environment-variabler
```env
OLLAMA_URL=http://localhost:11434
API_ENCRYPTION_KEY=<32-character hex string>
```

---

## 17. Chat-interfacets Avancerede Features

### Formål
Udover basischat tilbyder chat-interfacet avancerede kontekst- og datavalgsmuligheder.

### Træningssession-kontekst i Chat
- Bruger kan vælge hvilke specifikke sessioner der inkluderes i LLM-konteksten
- **Sport-filter:** Filtrér sessioner per sport (swim/bike/run/all)
- **Uge-visibility:** Konfigurerbar antal uger der vises til sessionvalg
- **Session-detaljer inkluderet:** Lap-data, metrics (HR, power, pace), zone-fordeling

### Fil-vedhæftning
- Bruger kan uploade atletdata-filer til AI-analyse
- Understøtter JSON-format med strukturerede data
- Sendes via OpenAI Responses API (fil-upload)

### Samtale-UI Features
- **Samtale-kollaps:** Beskeder kan kollapses for bedre overblik i lange samtaler
- **Titel-redigering:** Samtaletitel kan redigeres manuelt
- **JSON Format Templates:** Globale formateringsinstruktioner til AI-svar kan konfigureres
- **Kontekst-preview:** Bruger kan se hvilke data der sendes til LLM før afsendelse

### Custom Athlete Context
- Fri tekst-felt hvor bruger/coach kan tilføje yderligere kontekst
- Inkluderes i system prompt ved hvert kald
- Eksempler: "Jeg har en knæskade der begrænser løbedistance" eller "Fokus på Z2-base denne måned"

---

## 18. Udstyrsslitageprediktioner som Anbefalinger

### Formål
Automatisk generering af anbefalinger i Coach Inbox når udstyr nærmer sig levetidsgrænsen.

### Workflow
1. Baggrundsjob (`equipmentLifespanChecker`) kører periodisk
2. Beregner nuværende slitage-procent for alt udstyr med `retirement_km` eller `retirement_hours`
3. Sammenligner med atletens notifikationspræferencer (tærskler ved 75%, 90%, 100%)
4. Tjekker `equipment_notification_log` for at undgå gentagne advarsler
5. Opretter anbefaling i `recommendations`-tabellen med:
   - `category: 'equipment'`
   - `generated_by: 'system'`
   - `priority`: warning ved 75%, high ved 90%, critical ved 100%
   - Titel og beskrivelse med udstyrnavn, aktuel slitage og estimeret restlevetid

### Integration
- Anbefalinger vises i Coach Inbox sammen med AI-genererede og coach-oprettede anbefalinger
- Bruger kan acceptere (planlæg udstyrsudskiftning) eller afvise
- Bruger `equipment_notification_prefs`-tabel for per-atlet tærskelkonfiguration

### Ikke AI-baseret
Denne feature bruger regelbaseret logik, ikke LLM. Men den bruger samme recommendations-workflow som AI-features, og resultaterne vises i samme Coach Inbox.

---

---

# DEL 2: COACH-PERSPEKTIV — FEATURES DER MANGLER

Følgende features er identificeret af en Ironman-triatlon-coach som nødvendige for at AI-integrationen er brugbar i daglig coaching. Disse bygger oven på kerne-infrastrukturen fra Del 1.

---

## 19. Multi-atlet Triage Dashboard

### Formål
Coachens morgen-workflow: ét overblik over alle atleter med handlingsbare flags.

### Brugeroplevelse
Når coach åbner platformen, vises en prioriteret liste over alle atleter med:
- Hvem trænede i går og hvordan (compliance + RPE)
- Hvem har session i dag der kræver opmærksomhed
- Hvem har ikke uploadet data i 3+ dage
- Hvem har flag (HRV-drop, mistet sessioner, race nærmer sig)
- Hvem er i rest-week / taper / peak fase

### Backend
- `GET /api/coach/:coachId/triage` — Returnerer prioriteret atlet-liste med status-flags
- Aggregerer data fra: sessions, wellness_daily, planned_sessions, athlete_pmc, goals, ai_alerts
- Sorterer efter: kritiske alerts først, derefter race-nærhed, derefter compliance-problemer

### Frontend
- Dedikeret coach-dashboard side (ikke atlet-specifik)
- Atlet-kort med farvekodet status (grøn/gul/rød)
- Klik på atlet → navigerer til atletens dashboard
- AI-genereret sammenfatning per atlet (1-2 sætninger)

### AI-integration
- LLM genererer kort daglig sammenfatning per atlet baseret på data
- Coach kan spørge AI: "Hvilke atleter har brug for opmærksomhed i dag?"

---

## 20. RPE vs Planlagt-Intensitet Mismatch Alerts

### Formål
Automatisk alarm når atletens oplevede belastning (RPE) afviger markant fra den planlagte intensitet.

### Logik
- Planlagt session har `session_purpose` (fx 'recovery', 'endurance', 'threshold')
- Atlet rapporterer RPE efter session (1-10 skala)
- Mismatch-regler:
  - Recovery/easy session + RPE ≥ 7 → warning: "Session planlagt som let, men oplevet som hård"
  - Threshold/VO2max session + RPE ≤ 4 → info: "Session planlagt som hård, men oplevet som let — overvej at justere intensitetszoner"
  - Enhver session + RPE ≥ 9 to dage i træk → warning: "Høj belastningsoplevelse to dage i træk"

### Implementation
- Baggrundsjob der kører efter session-upload når planlagt session er linket (`completed_session_id`)
- Opretter `ai_alerts` med `alert_type: 'rpe_mismatch'`
- Vises i Coach Inbox og coach triage dashboard

### Database
- Bruger eksisterende `planned_sessions.session_purpose` + `sessions.session_quality` eller nyt RPE-felt
- Kan kræve nyt felt: `sessions.perceived_exertion` (INT 1-10)

---

## 21. Constraint-Aware Træningsplan Generering

### Formål
AI-genererede træningsplaner der respekterer atletens reelle begrænsninger.

### Constraints der skal understøttes
| Constraint | Eksempel |
|------------|---------|
| Tilgængelige dage | "Kan kun træne tirs/tors/lør/søn" |
| Max ugentlig volumen | "Max 10 timer/uge" |
| Faciliteter | "25m pool, ingen open water før juni" |
| Udstyr | "Ingen wattmåler på cykel" |
| Skade/begrænsning | "Ingen løb over 10km pga. knæ" |
| Arbejdskalender | "Rejser uge 20-21, kun hotel-gym" |

### Database
Ny tabel: `athlete_training_constraints`
| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | UUID PK | |
| athlete_id | UUID FK | |
| constraint_type | VARCHAR | 'available_days', 'max_volume', 'facility', 'equipment', 'injury', 'travel' |
| constraint_data | JSONB | Struktureret constraint-data |
| valid_from | DATE | Gyldig fra |
| valid_to | DATE NULL | Gyldig til (NULL = permanent) |
| created_at | TIMESTAMP | |

### AI-integration
- Constraints inkluderes i system prompt ved plan-generering
- AI respekterer constraints og forklarer eventuelle kompromiser
- Frontend: Constraints-editor på atletprofil-siden

---

## 22. Race-Week Modul

### Formål
Komplet race-week planlægning med taper, pacing, ernæring og logistik.

### Delkomponenter

**22a. Taper-protokol generering**
- Individualiseret baseret på atletens historiske taper-respons
- Input: Nuværende CTL/ATL, race-dato, race-distance, historiske taper-data
- Output: Dag-for-dag plan med TSS-targets for taper-perioden
- Eksisterende `TaperSection`-komponent kan udvides

**22b. Race-day pacing strategi**
- Baseret på: atletens power/pace data, kursusprofil (hvis tilgængelig), target-tid
- Output: Cykel power-plan per segment, løbe pace-plan per km, svøm pace-plan
- Tilpasset forventede forhold (varme, vind, højde)
- Integreret med eksisterende `RacePlan`-side

**22c. Race-day ernæringsplan**
- Kalorier og væske per time per disciplin
- Baseret på: svedrate (hvis testet), forventet varighed, kropsægt
- Specifik timing: hvornår at spise/drikke i forhold til race-ur
- Integreret med eksisterende `raceNutritionItems`-tabel

**22d. Pre-race checklist**
- AI-genereret personlig checklist baseret på: race-type, udstyr, logistik
- Inkluderer: udstyrskontrol, ernæringsforberedelse, transport, timing

**22e. Post-race debrief**
- Struktureret analyse: hvad gik godt/dårligt
- Sammenligning: plan vs. aktuel (pace, power, ernæring, splits)
- Anbefalinger til næste race
- Backend: `POST /api/ai-coaching/:athleteId/race-debrief/:goalId`

---

## 23. AI Kommunikationsudkast

### Formål
AI-genererede beskeder fra coach til atlet — sparer coach-tid ved skalaeret coaching.

### Beskedtyper
| Type | Trigger | Indhold |
|------|---------|---------|
| Ugentlig check-in | Mandag morgen | Opsummering af sidste uge + fokus for denne uge |
| Pre-race note | 3 dage før race | Opmuntring, påmindelser, taper-status |
| Post-session feedback | Efter nøgle-session | Analyse af sessionen, hvad der gik godt |
| Compliance-nudge | 3+ dage uden upload | Venlig påmindelse om at uploade data |
| Milestone-besked | CTL all-time high, PR | Fejring af fremskridt |

### Workflow
1. AI genererer udkast baseret på atletens data
2. Coach reviewer og redigerer udkast
3. Coach sender besked (via platform-besked, email, eller chat)
4. Besked logges

### Backend
- `POST /api/ai-coaching/:coachId/draft-message/:athleteId` — Generer beskedudkast
- Request: `{ type: 'weekly_checkin' | 'pre_race' | ... }`
- Response: `{ draft: "Beskedtekst...", context: { ... } }`

---

## 24. Udvidet Træningsdata-kontekst

### Formål
AI'en skal have adgang til dybere og bredere data for at give kvalificerede svar.

### Manglende kontekst-data

**24a. Historiske raceresultater**
- Tabel: `race_results` med: goal_id, actual_swim_time, actual_bike_time, actual_run_time, actual_total_time, conditions, notes
- Inkluderes i AI-kontekst: "Sidste Ironman: 10:34 (1:05 / 5:22 / 3:52) — cyklede for hårdt, blowup på løb"

**24b. 12+ måneders træningshistorik**
- Udvidet data-range option: '3months', '6months', '12months', 'all'
- Opsummeret format (ikke rå sessioner): ugentlig TSS, CTL-kurve, PR-historik
- Forhindrer token-overload ved at opsummere i stedet for at sende rå data

**24c. Skadeshistorik**
- Ny tabel eller udvidelse af eksisterende `injuries`-tabel
- Inkluderer: skadestype, lokation, varighed, behandling, triggers (volumen/intensitet)
- AI-kontekst: "3 lægskader de sidste 18 mdr, alle ved >65km løb/uge"

**24d. Miljøkontekst**
- Atletens lokation (fra profil eller GPS)
- Aktuel vejrdata via ekstern API (temperatur, fugtighed, vind)
- AI-kontekst: "Atleten træner i 32°C og 80% luftfugtighed — juster forventninger"

---

## 25. Skadeshåndtering & Return-to-Training

### Formål
AI-støttet genoptræning efter skade med gradueret belastningsøgning.

### Workflow
1. Coach/atlet registrerer skade (type, lokation, sværhedsgrad, dato)
2. AI genererer return-to-training protokol baseret på: skadestype, atletens historik, tid til næste race
3. Protokollen integreres i kalenderen som planlagte sessioner med `ai_generated: true`
4. AI monitorerer compliance og justerer protokol

### Features
- **Cross-training substitution**: Kan ikke løbe → AI foreslår aqua jogging, cykling, elliptical med tilsvarende intensitet
- **Rehab-øvelser integration**: Fysioterapeut-ordinerede øvelser integreres i warmup/cooldown
- **Belastnings-gates**: AI tillader ikke intensitetsøgning før forudgående niveau er gennemført smertefrit
- **Skadeshistorik mønstergenkendelse**: "Denne atlet får altid lægskader over 65km/uge — flag når planen nærmer sig det"

### Database
Udvidelse af eksisterende `injuries`-tabel med:
- `return_protocol` JSONB — AI-genereret protokol
- `current_phase` VARCHAR — 'acute', 'subacute', 'return_to_run', 'full_training'
- `clearance_date` DATE — Dato for fuld frigivelse

---

## 26. Ernæringsperiodisering

### Formål
Daglige ernæringsmål koblet direkte til træningsbelastning.

### Features
- **Daglig kalorietarget**: Beregnet fra: BMR + aktivitetskalori baseret på planlagt/gennemført træning
- **Kulhydrat-periodisering**: Sessions tagget med fuelingsintent ('fasted', 'low_carb', 'full_fuel', 'race_fuel')
- **Race-week carb loading**: Individualiseret protokol baseret på kropsægt og race-distance
- **Session-specifik fueling**: "Denne threshold-session kræver 60g CHO/time. Start fueling 15 min inde."

### Integration
- Fueling-tags på planlagte sessioner i `session_blocks` JSONB
- Daglig ernæringsoversigt på dashboard
- AI kan besvare: "Hvad skal jeg spise før min lange cykeltur i morgen?"

---

## 27. Mental Readiness & Burnout Prævention

### Formål
Tracking af atletens mentale tilstand med tidlig advarsel om burnout og race-angst.

### Datapunkter
- **Pre-session readiness**: Motivation (1-5), energi (1-5), stress (1-5) — samles via eksisterende wellness-log
- **Engagement-tracking**: Upload-frekvens, chat-aktivitet, feedback-dybde — beregnes automatisk
- **Konfidensscoring**: Succesfulde race-simulationer og nøglesessioner tracker → positiv trend

### AI-analyse
- **Burnout-risiko**: Kombination af høj monotoni + faldende motivation + faldende compliance → flag
- **Race-angst detektion**: Sprogmønstre i chat (overdreven bekymring, "hvad-nu-hvis" spørgsmål) → coach alert
- **Disengagement warning**: 5+ dage uden upload + faldende chat-aktivitet → "Atleten trækker sig"

### Alerts
- Oprettes i `ai_alerts` med `alert_type: 'burnout_risk'`, `'anxiety'`, `'disengagement'`
- Severity baseret på antal indikatorer og varighed

---

## 28. Avanceret AI-Powered Analytics

### Formål
Dybere automatisk analyse der giver coach og atlet actionable insights.

### 28a. Decoupling-analyse
- Automatisk beregning af HR:pace/power drift i 2. halvdel af lange sessioner
- Tracking over tid: faldende decoupling = bedre aerob fitness
- Threshold: <5% = god aerob base, >5% = aerob fitness under udvikling
- Allerede delvist implementeret i `session_analytics.decoupling`

### 28b. Sæson-over-sæson Benchmarking
- Sammenlign nuværende form med samme tidspunkt forrige år
- Metrics: CTL, FTP, threshold pace, CSS, ugentlig volumen
- AI-kontekst: "Samme tidspunkt sidste år: CTL 45, FTP 250. Nu: CTL 59, FTP 276. Du er foran."
- Kræver: 12+ måneders data i PMC-tabel

### 28c. Taper-respons Prediktion
- Baseret på historiske data: hvordan reagerede atleten på tidligere tapers?
- Input: Peak CTL, taper-længde, taper-profil (konservativ/moderat/aggressiv)
- Output: Forventet race-day CTL, TSB, og estimeret performance-gain (%)
- Kræver: Mindst 2 tidligere taper+race datapoints

### 28d. Disciplin-balance Analyse
- Sammenlign faktisk disciplinfordeling med optimal for race-mål
- "Du svømmer 4x/uge men løber kun 2x. For dit Ironman-mål med en svag løbedel er dette suboptimalt."
- Anbefalinger til rebalancering baseret på atletens svagheder
- Allerede delvist implementeret i ugerapportens DisciplineBalance komponent

### 28e. Træningsalder & Adaptationsmodellering
- Estimér atletens træningsalder (år med struktureret træning)
- Model forventet adaptationsrate: nybegynder adapterer hurtigere end veteran
- Flag når fremskridt er langsommere eller hurtigere end forventet
- "Din CTL-stigning er 2 points/uge, hvilket er normalt for en atlet med 3 års erfaring"

---

## 29. Implementeringsrækkefølge (opdateret)

### Fase 1: Kerne-infrastruktur
1. **Database-migrationer** — Opret tabeller: chat_conversations, chat_messages, llm_usage, athlete_llm_preferences, system_llm_settings, ai_coaching_preferences, ai_daily_briefings, ai_alerts, alert_rules, ai_suggestion_log, coach_notes, recommendations, athlete_training_constraints, race_results
2. **Backend services** — llmPreferencesService, llmUsageService, llmPricingService, effectiveLLMService

### Fase 2: Chat & konfiguration
3. **Backend routes** — ai.ts (chat + plan), chatMessages.ts, llmPreferences.ts, llmUsage.ts
4. **Frontend hooks** — useChat, useConversations, useLLMPreferences, useLLMUsage
5. **Frontend komponenter** — AIChatTab, LLMUsageStats, AthleteLLMLimits
6. **Frontend sider** — CoachAssistant-side, LLM-indstillinger i admin

### Fase 3: AI-analyse & anbefalinger
7. **Backend routes** — recommendations.ts, ai-coaching alerts/preferences/briefing
8. **Frontend komponenter** — CoachInbox, AISummary, DailyBriefing
9. **Integration** — Session/ugentlig/månedlig AI-resumé, session feedback med analytics

### Fase 4: Coach-workflows
10. **Multi-atlet triage dashboard** (sektion 19)
11. **RPE vs planlagt-intensitet mismatch alerts** (sektion 20)
12. **AI kommunikationsudkast** (sektion 23)
13. **Coach notes** — CRUD + session-integration (sektion 13)

### Fase 5: Plan-generering & constraints
14. **Træningsplan-generering** — LLM + AI Training Parser + import (sektion 8)
15. **Constraint-aware plan-generering** (sektion 21)
16. **AI coaching preferences** — Kommunikationsstil + fokusområder (sektion 11)

### Fase 6: Race & skade
17. **Race-week modul** — Taper, pacing, ernæring, checklist, debrief (sektion 22)
18. **Skadeshåndtering & return-to-training** (sektion 25)
19. **Ernæringsperiodisering** (sektion 26)

### Fase 7: Avanceret analytics & mental readiness
20. **Udvidet træningsdata-kontekst** — 12+ mdr historik, raceresultater, miljø (sektion 24)
21. **Avanceret AI-analytics** — Decoupling, sæson-benchmarking, taper-prediktion (sektion 28)
22. **Mental readiness & burnout prævention** (sektion 27)

### Fase 8: Infrastruktur-udvidelse
23. **Alert rules** — Automatisk generering + management UI (sektion 10)
24. **AI suggestion logging** — Tracking + feedback loop (sektion 12)
25. **Chat avancerede features** — Session-kontekst valg, fil-vedhæftning (sektion 17)
26. **Udstyrsslitageprediktioner** — Baggrundsjob + Coach Inbox (sektion 18)

---

*Spec genereret: 16. april 2026*
*Opdateret: 16. april 2026 — tilføjet sektioner 10-15 (alerts, coaching preferences, suggestion logging, coach notes, daily briefing, session feedback)*
*Opdateret: 16. april 2026 — tilføjet sektioner 17-18 (chat avancerede features, udstyrsslitageprediktioner), sektion 8 tilpasset Ratizons planned_sessions datamodel*
*Opdateret: 16. april 2026 — tilføjet sektioner 19-28 (coach-perspektiv: triage, RPE alerts, constraints, race-week, kommunikation, skadeshåndtering, ernæring, mental readiness, avanceret analytics)*
*Kilde: ironcoach20260128 kodebase + Ironman coach-ekspert review*
*Mål: Fuld implementering i Ratizon*
