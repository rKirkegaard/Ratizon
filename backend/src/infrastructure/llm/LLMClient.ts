import OpenAI from "openai";
import { logUsageAsync } from "../../domain/services/LLMUsageService.js";

// ── Provider clients ─────────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

function generateMockResponse(systemPrompt: string): string {
  if (systemPrompt.includes("briefing") || systemPrompt.includes("daglig")) {
    return MOCK_BRIEFING;
  }
  if (systemPrompt.includes("session") || systemPrompt.includes("feedback")) {
    return MOCK_SESSION_FEEDBACK;
  }
  return getMockChatResponse();
}

// ── Types ─────────────────────────────────────────────────────────────

export type LLMProvider = "openai" | "anthropic" | "mock";

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: LLMProvider;
  athleteId?: string;       // for usage logging
  requestType?: string;     // chat, briefing, feedback, plan
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

// ── Provider implementations ─────────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: LLMOptions
): Promise<LLMResponse> {
  if (!openaiClient) throw new Error("OpenAI not configured");

  const model = options.model ?? "gpt-4o-mini";
  const response = await openaiClient.chat.completions.create({
    model,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  return {
    content: response.choices[0]?.message?.content ?? "Ingen respons.",
    provider: "openai",
    model,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
  };
}

async function callAnthropic(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: LLMOptions
): Promise<LLMResponse> {
  if (!ANTHROPIC_API_KEY) throw new Error("Anthropic not configured");

  const model = options.model ?? "claude-sonnet-4-6";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${err}`);
  }

  const data = await response.json() as any;
  const content = data.content?.[0]?.text ?? "Ingen respons.";

  return {
    content,
    provider: "anthropic",
    model,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  };
}

// ── Resolve provider ────────────────────────────────────────────────

function resolveProvider(requested?: LLMProvider): LLMProvider {
  if (requested === "anthropic" && ANTHROPIC_API_KEY) return "anthropic";
  if (requested === "openai" && openaiClient) return "openai";
  if (openaiClient) return "openai";
  if (ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Generate a completion from the LLM (single turn).
 */
export async function generateCompletion(
  systemPrompt: string,
  userMessage: string,
  options: LLMOptions = {}
): Promise<string> {
  const result = await generateChatCompletionFull(
    systemPrompt,
    [{ role: "user", content: userMessage }],
    options
  );
  return result.content;
}

/**
 * Generate a chat completion with full conversation history.
 */
export async function generateChatCompletion(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: LLMOptions = {}
): Promise<string> {
  const result = await generateChatCompletionFull(systemPrompt, messages, options);
  return result.content;
}

/**
 * Full response with metadata (tokens, provider, model).
 */
export async function generateChatCompletionFull(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const provider = resolveProvider(options.provider);

  if (provider === "mock") {
    console.log("[LLM] Ingen API noegle konfigureret - bruger mock response");
    return {
      content: generateMockResponse(systemPrompt),
      provider: "mock",
      model: "mock",
    };
  }

  try {
    let result: LLMResponse;

    if (provider === "anthropic") {
      result = await callAnthropic(systemPrompt, messages, options);
    } else {
      result = await callOpenAI(systemPrompt, messages, options);
    }

    // Log usage async (non-blocking)
    if (options.athleteId && result.inputTokens != null && result.outputTokens != null) {
      logUsageAsync({
        athleteId: options.athleteId,
        provider: result.provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        requestType: options.requestType ?? "chat",
      });
    }

    return result;
  } catch (error: any) {
    console.error(`[LLM] ${provider} API fejl:`, error.message);
    // Fallback to mock
    return {
      content: generateMockResponse(systemPrompt),
      provider: "mock",
      model: "mock",
    };
  }
}
