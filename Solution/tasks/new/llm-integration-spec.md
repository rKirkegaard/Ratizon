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

## 8. AI-genererede Træningsplaner

### Formål
Generering af strukturerede 4-ugers træningsplaner via lokal Ollama.

### Backend-endpoint
| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| POST | `/api/ai/generate-plan/:athleteId` | Generer plan |
| GET | `/api/ai/models` | Liste Ollama-modeller |

### Request
```json
{
  "model": "llama3.2",
  "customPrompt": "..."
}
```

### Plan-format
4-ugers plan med dag-for-dag breakdown:
- Sport (swim/bike/run)
- Varighed, intensitet
- Opvarmning, hoveddel, nedkøling
- Pace og HR-zone per del
- TSS-estimat

### AI Training Parser
Utility der konverterer AI-tekst til strukturerede sessioner:
- Detekterer: ugenumre, dagnavne (dansk), sportsgrene, varigheder
- Normaliserer: sportnavne, varighedsformater, intensitetsniveauer
- Estimerer TSS fra varighed × intensitetsmultiplikator

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

## 10. Kryptering & Sikkerhed

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

## 11. Implementeringsrækkefølge (anbefalet)

1. **Database-migrationer** — Opret tabeller: chat_conversations, chat_messages, recommendations, llm_usage, athlete_llm_preferences, system_llm_settings
2. **Backend services** — llmPreferencesService, llmUsageService, llmPricingService, effectiveLLMService
3. **Backend routes** — ai.ts (chat + plan), chatMessages.ts, llmPreferences.ts, llmUsage.ts, recommendations.ts
4. **Frontend hooks** — useChat, useConversations, useLLMPreferences, useLLMUsage, useRecommendations
5. **Frontend komponenter** — AIChatTab, CoachInbox, LLMUsageStats, AthleteLLMLimits, AISummary
6. **Frontend sider** — CoachAssistant-side, LLM-indstillinger i admin
7. **Integration** — Session/ugentlig/månedlig AI-resumé, træningsplan-generering

---

*Spec genereret: 16. april 2026*
*Kilde: ironcoach20260128 kodebase*
*Mål: Fuld implementering i Ratizon*
