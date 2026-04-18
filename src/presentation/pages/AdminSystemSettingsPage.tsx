import { useState, useEffect } from "react";
import { apiClient } from "@/application/api/client";
import { LLM_PROVIDERS, getModelsForProvider, getProvider } from "@/domain/constants/llmProviders";
import { Brain, Key, Eye, EyeOff, Save, Trash2, Loader2, Palette, FileText, ShieldAlert, BarChart3, Settings, Wrench } from "lucide-react";
import ZoneColorPicker from "@/presentation/components/settings/ZoneColorPicker";
import SportConfigEditor from "@/presentation/components/settings/SportConfigEditor";
import GarminConnection from "@/presentation/components/settings/GarminConnection";
import DatePickerPreview from "@/presentation/components/settings/DatePickerPreview";
import AICoachingPreferences from "@/presentation/components/settings/AICoachingPreferences";
import AlertRulesEditor from "@/presentation/components/settings/AlertRulesEditor";
import LLMUsagePanel from "@/presentation/components/settings/LLMUsagePanel";
import { useAthleteStore } from "@/application/stores/athleteStore";

interface SystemSettings {
  defaultProvider: string;
  defaultModel: string;
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  hasGoogleKey: boolean;
  hasMistralKey: boolean;
  globalMonthlyBudgetCents: number | null;
  defaultSystemContext: string | null;
  defaultTrainingDataRange?: string;
  chatBasePrompt?: string;
  planBasePrompt?: string;
}

type Tab = "ai" | "prompts" | "alerts" | "visuals" | "integrations";

const DATA_RANGES = [
  { value: "single", label: "Enkelt session" },
  { value: "1week", label: "1 uge" },
  { value: "2weeks", label: "2 uger" },
  { value: "3weeks", label: "3 uger" },
  { value: "4weeks", label: "4 uger" },
];

function hasKeyForProvider(settings: SystemSettings | null, providerId: string): boolean {
  if (!settings) return false;
  const map: Record<string, keyof SystemSettings> = {
    openai: "hasOpenaiKey", anthropic: "hasAnthropicKey", google: "hasGoogleKey", mistral: "hasMistralKey",
  };
  return !!(settings as any)[map[providerId] ?? ""] ?? false;
}

function apiKeyFieldName(providerId: string): string {
  const map: Record<string, string> = {
    openai: "openaiApiKey", anthropic: "anthropicApiKey", google: "googleApiKey", mistral: "mistralApiKey",
  };
  return map[providerId] ?? `${providerId}ApiKey`;
}

const TABS: Array<{ key: Tab; label: string; icon: typeof Brain }> = [
  { key: "ai", label: "AI & LLM", icon: Brain },
  { key: "prompts", label: "Prompts", icon: FileText },
  { key: "alerts", label: "Alerts & Coaching", icon: ShieldAlert },
  { key: "visuals", label: "Visuals & Kalender", icon: Palette },
  { key: "integrations", label: "Integrationer", icon: Wrench },
];

export default function AdminSystemSettingsPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("ai");

  // Form state
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("");
  const [dataRange, setDataRange] = useState("2weeks");
  const [budget, setBudget] = useState("");
  const [systemContext, setSystemContext] = useState("");

  // Prompt editors
  const [chatPrompt, setChatPrompt] = useState("");
  const [planPrompt, setPlanPrompt] = useState("");
  const [savingPrompts, setSavingPrompts] = useState(false);

  // API key state
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const loadSettings = async () => {
    try {
      const data: any = await apiClient.get("/llm/settings");
      const s = data?.data ?? data ?? {};
      setSettings(s);
      setProvider(s.defaultProvider ?? "openai");
      setModel(s.defaultModel ?? "");
      setDataRange(s.defaultTrainingDataRange ?? "2weeks");
      setBudget(s.globalMonthlyBudgetCents ? String(s.globalMonthlyBudgetCents / 100) : "");
      setSystemContext(s.defaultSystemContext ?? "");
      setChatPrompt(s.chatBasePrompt ?? "");
      setPlanPrompt(s.planBasePrompt ?? "");
    } catch { /* ignore */ }
    setLoading(false);
  };

  // Load base prompts from backend
  const loadPrompts = async () => {
    try {
      const data: any = await apiClient.get("/llm/prompts");
      const p = data?.data ?? data ?? {};
      if (p.chatPrompt && !chatPrompt) setChatPrompt(p.chatPrompt);
      if (p.planPrompt && !planPrompt) setPlanPrompt(p.planPrompt);
    } catch { /* prompts endpoint may not exist yet */ }
  };

  useEffect(() => { loadSettings(); loadPrompts(); }, []);

  const handleSaveDefaults = async () => {
    setSaving(true);
    await apiClient.put("/llm/settings", {
      defaultProvider: provider,
      defaultModel: model,
      defaultTrainingDataRange: dataRange,
      globalMonthlyBudgetCents: budget ? Math.round(parseFloat(budget) * 100) : null,
      defaultSystemContext: systemContext || null,
    }).catch(() => {});
    await loadSettings();
    setSaving(false);
  };

  const handleSavePrompts = async () => {
    setSavingPrompts(true);
    await apiClient.put("/llm/settings", {
      defaultSystemContext: systemContext || null,
    }).catch(() => {});
    setSavingPrompts(false);
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyValue.trim()) return;
    setSavingKey(true);
    await apiClient.put("/llm/settings", { [apiKeyFieldName(provider)]: apiKeyValue }).catch(() => {});
    setApiKeyValue("");
    await loadSettings();
    setSavingKey(false);
  };

  const handleDeleteApiKey = async () => {
    setSavingKey(true);
    await apiClient.put("/llm/settings", { [apiKeyFieldName(provider)]: "" }).catch(() => {});
    await loadSettings();
    setSavingKey(false);
  };

  const selectedProvider = getProvider(provider);
  const models = getModelsForProvider(provider);
  const providerHasKey = hasKeyForProvider(settings, provider);

  if (loading) {
    return (
      <div data-testid="admin-system-settings" className="p-4 md:p-6">
        <div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Henter indstillinger...</span></div>
      </div>
    );
  }

  return (
    <div data-testid="admin-system-settings" className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Indstillinger</h1>
        <p className="text-sm text-muted-foreground">Konfigurer AI, prompts, API-noegler, zone-farver og system-standarder</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            data-testid={`admin-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: AI & LLM ═══ */}
      {tab === "ai" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <h2 className="text-base font-semibold text-foreground">AI Standard-indstillinger</h2>
            </div>
            <p className="text-xs text-muted-foreground">Nedarves af atleter medmindre de har brugerdefinerede praeferencer.</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Standard provider</label>
                <select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(""); setApiKeyValue(""); setShowApiKey(false); }} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                  {LLM_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Standard model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <option value="">Vaelg model...</option>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {selectedProvider?.requiresApiKey && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-amber-400" />
                  <span className="text-xs font-medium text-foreground">API Noegle — {selectedProvider.name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${providerHasKey ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                    {providerHasKey ? "Konfigureret" : "Ikke sat"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type={showApiKey ? "text" : "password"} value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)} placeholder={selectedProvider.apiKeyPlaceholder ?? "API noegle..."} className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground font-mono" />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button onClick={handleSaveApiKey} disabled={!apiKeyValue.trim() || savingKey} className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
                    {savingKey ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Gem
                  </button>
                </div>
                {providerHasKey && (
                  <button onClick={handleDeleteApiKey} disabled={savingKey} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                    <Trash2 size={12} /> Fjern noegle
                  </button>
                )}
              </div>
            )}

            {provider === "local" && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Lokale modeller kraever ingen API-noegle. Soerg for at Ollama koerer paa <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">localhost:11434</code>.</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Traeningsdata range</label>
                <select value={dataRange} onChange={(e) => setDataRange(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                  {DATA_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Globalt maanedligt budget (USD)</label>
                <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Intet loft" step="0.50" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
              </div>
            </div>

            <button onClick={handleSaveDefaults} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Gem AI indstillinger
            </button>
          </div>

          {athleteId && <LLMUsagePanel athleteId={athleteId} />}
        </div>
      )}

      {/* ═══ TAB: Prompts ═══ */}
      {tab === "prompts" && (
        <div className="space-y-6">
          {/* System context (editable) */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-semibold text-foreground">System-kontekst (AI Persona)</h2>
            </div>
            <p className="text-xs text-muted-foreground">Denne tekst praefikses til ALLE AI-kald. Brug den til at definere AI-coachens personlighed og adfaerd.</p>
            <textarea
              data-testid="system-context-editor"
              value={systemContext}
              onChange={(e) => setSystemContext(e.target.value)}
              rows={6}
              placeholder="Du er en erfaren triathlon-traener specialiseret i udholdenhedstraening..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground resize-y"
            />
            <button onClick={handleSavePrompts} disabled={savingPrompts} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {savingPrompts ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Gem system-kontekst
            </button>
          </div>

          {/* Chat base prompt (read-only view of what's sent) */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              <h2 className="text-base font-semibold text-foreground">Chat Base-Prompt</h2>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Fast i koden</span>
            </div>
            <p className="text-xs text-muted-foreground">Denne prompt sendes altid med chat-beskeder. Den kan ikke redigeres her — den er defineret i backend-koden.</p>
            <div className="rounded-lg bg-muted/20 border border-border/50 p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap">{`Du er en AI triatlon-coach i Ratizon platformen. Du svarar paa dansk.

Du hjaelper atleter med:
- Traeningsplaner og -raad
- Analyse af traeningsdata
- Restitution og wellness
- Naering og hydreering
- Mentale strategier
- Tekniske forbedringer

Vaar venlig, professionel og specifik. Hold svarene korte og handlingsorienterede.`}</pre>
            </div>
            <p className="text-[10px] text-muted-foreground">Fulde prompt = system-kontekst (ovenfor) + denne base-prompt + atletens traeningsdata (profil, sessioner, wellness, PMC, maal, skader).</p>
          </div>

          {/* Plan generation prompt (read-only) */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-400" />
              <h2 className="text-base font-semibold text-foreground">Traeningsplan-Prompt</h2>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Fast i koden</span>
            </div>
            <p className="text-xs text-muted-foreground">Denne prompt bruges naar AI genererer traeningsplaner. Den indeholder detaljerede zone-definitioner for cykling, loeb og svoemning.</p>
            <div className="rounded-lg bg-muted/20 border border-border/50 p-3 max-h-64 overflow-y-auto">
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap">{`CYKLING — Power-zoner baseret paa atletens FTP:
• Recovery Z1: <55% FTP
• Endurance Z2: 56-75% FTP
• Tempo Z3: 76-87% FTP
• Sweet Spot: 88-93% FTP — ALTID intervaller: 3-4x10-20min
• Threshold Z4: 94-105% FTP — ALTID intervaller: 3-5x8-15min
• VO2max Z5: 106-120% FTP — ALTID intervaller: 5-8x3-5min

LOEB — Pace-zoner baseret paa threshold pace:
• Recovery Z1: threshold + 1:30-2:00 min/km
• Endurance Z2: threshold + 0:45-1:15 min/km
• Tempo Z3: threshold + 0:15-0:30 min/km
• Threshold Z4: threshold ± 0:10 — ALTID intervaller
• VO2max Z5: threshold - 0:30-0:45 — ALTID intervaller

SVOEMNING — Pace-zoner baseret paa CSS:
• Recovery: CSS + 15-20 sek/100m
• Endurance: CSS + 5-10 sek/100m
• CSS pace: CSS ± 3 sek/100m
• Threshold: CSS - 3-5 sek — intervaller med 15-30 sek pause
• VO2max: CSS - 8-15 sek — intervaller med 20-30 sek pause

Alle sessioner genereres med session_blocks:
warmup → interval/steady → cooldown
med praecise watt/pace/HR-targets baseret paa atletens taerskler.`}</pre>
            </div>
          </div>

          {/* Data context preview */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-foreground">Datakontekst (automatisk)</h2>
            </div>
            <p className="text-xs text-muted-foreground">Denne data inkluderes automatisk i alle AI-kald baseret paa den valgte atlet:</p>
            <div className="rounded-lg bg-muted/20 border border-border/50 p-3">
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <span className="text-foreground">Atletprofil:</span> Max HR, FTP, LTHR, CSS, threshold pace, vaegt, hoejde</li>
                <li>• <span className="text-foreground">PMC status:</span> CTL, ATL, TSB med fortolkning (frisk/traet/overtranset)</li>
                <li>• <span className="text-foreground">Wellness:</span> Soevn, HRV, humur, motivation, energi, stress</li>
                <li>• <span className="text-foreground">Sessioner:</span> Seneste 20 sessioner med HR, power, pace, TSS, RPE, laps</li>
                <li>• <span className="text-foreground">Maal:</span> Aktive race-maal med dage til race</li>
                <li>• <span className="text-foreground">Skader:</span> Aktive skader med fase og lokation</li>
                <li>• <span className="text-foreground">Coaching prefs:</span> Kommunikationsstil og fokusomraader</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: Alerts & Coaching ═══ */}
      {tab === "alerts" && (
        <div className="space-y-6">
          {athleteId && <AICoachingPreferences athleteId={athleteId} />}
          {athleteId && <AlertRulesEditor athleteId={athleteId} />}
        </div>
      )}

      {/* ═══ TAB: Visuals & Calendar ═══ */}
      {tab === "visuals" && (
        <div className="space-y-6">
          <DatePickerPreview />
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-semibold text-foreground">Zone-farver & Visuel Konfiguration</h2>
            </div>
            <ZoneColorPicker />
          </div>
        </div>
      )}

      {/* ═══ TAB: Integrations ═══ */}
      {tab === "integrations" && (
        <div className="space-y-6">
          {athleteId && <SportConfigEditor athleteId={athleteId} />}
          {athleteId && <GarminConnection athleteId={athleteId} />}
        </div>
      )}
    </div>
  );
}
