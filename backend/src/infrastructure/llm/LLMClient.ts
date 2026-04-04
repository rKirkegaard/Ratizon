import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let openaiClient: OpenAI | null = null;

if (OPENAI_API_KEY && OPENAI_API_KEY.trim().length > 0) {
  openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
}

// ── Mock responses ─────────────────────────────────────────────────────

const MOCK_BRIEFING = `Din form ser god ud i dag. Baseret paa din traening de seneste dage og din wellness-data, er du klar til en moderat til haerd traening.

**Status:** Groent lys
**Anbefaling:** Fortsaet med den planlagte traening. Din belastning er godt balanceret, og din restitution ser ud til at vaere tilstraekkelig.
**Fokusomraader:** Bevar tempoet fra de seneste sessioner og vaar opmaerksom paa din hydreringsstatus.`;

const MOCK_SESSION_FEEDBACK = `Sessionen var vellykket med gode intensitetsniveauer.

**Overordnet vurdering:** God session med stabil pulskontrol.
**Styrker:** Konsistent tempo, god hjertefrekvensrespons.
**Forbedringer:** Cadence kan optimeres lidt - proev at oege med 2-3 rpm naeste gang.
**Naeste session:** En let restitutionstraening ville vaere optimal som opfoelgning.`;

const MOCK_CHAT_RESPONSES = [
  "Baseret paa din aktuelle traening ville jeg anbefale at fokusere paa zone 2 traening de naeste par dage for at opbygge din aerobe base.",
  "Din belastning har vaeret stigende de seneste 2 uger. Overvaej at laegge en hviledag ind for at undgaa overtraening.",
  "God session! Din puls var lidt hoejere end forventet - sov du godt i nat?",
  "For at forbedre din FTP kan du proeve soedsone-intervaller: 2x20 min ved 95-100% af FTP med 5 min pause.",
];

function getMockChatResponse(): string {
  return MOCK_CHAT_RESPONSES[Math.floor(Math.random() * MOCK_CHAT_RESPONSES.length)];
}

// ── Public API ─────────────────────────────────────────────────────────

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generate a completion from the LLM.
 * Falls back to mock responses when no API key is configured.
 */
export async function generateCompletion(
  systemPrompt: string,
  userMessage: string,
  options: LLMOptions = {}
): Promise<string> {
  if (!openaiClient) {
    console.log("[LLM] Ingen OpenAI API noegle konfigureret - bruger mock response");
    return generateMockResponse(systemPrompt, userMessage);
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: options.model ?? "gpt-4o-mini",
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    return response.choices[0]?.message?.content ?? "Ingen respons fra AI.";
  } catch (error: any) {
    console.error("[LLM] Fejl ved API kald:", error.message);
    // Fall back to mock
    return generateMockResponse(systemPrompt, userMessage);
  }
}

/**
 * Generate a chat completion with full conversation history.
 */
export async function generateChatCompletion(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: LLMOptions = {}
): Promise<string> {
  if (!openaiClient) {
    console.log("[LLM] Ingen OpenAI API noegle konfigureret - bruger mock chat response");
    return getMockChatResponse();
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: options.model ?? "gpt-4o-mini",
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    return response.choices[0]?.message?.content ?? "Ingen respons fra AI.";
  } catch (error: any) {
    console.error("[LLM] Fejl ved chat API kald:", error.message);
    return getMockChatResponse();
  }
}

function generateMockResponse(systemPrompt: string, _userMessage: string): string {
  if (systemPrompt.includes("briefing") || systemPrompt.includes("daglig")) {
    return MOCK_BRIEFING;
  }
  if (systemPrompt.includes("session") || systemPrompt.includes("feedback")) {
    return MOCK_SESSION_FEEDBACK;
  }
  return getMockChatResponse();
}
