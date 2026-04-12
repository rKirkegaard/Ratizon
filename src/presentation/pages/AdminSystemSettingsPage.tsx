import { useState, useEffect } from "react";
import { apiClient } from "@/application/api/client";
import { LLM_PROVIDERS, getModelsForProvider, getProvider } from "@/domain/constants/llmProviders";
import { Brain, Key, Eye, EyeOff, Save, Trash2, Loader2, Palette } from "lucide-react";
import ZoneColorPicker from "@/presentation/components/settings/ZoneColorPicker";
import SportConfigEditor from "@/presentation/components/settings/SportConfigEditor";
import GarminConnection from "@/presentation/components/settings/GarminConnection";
import DatePickerPreview from "@/presentation/components/settings/DatePickerPreview";
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
}

const DATA_RANGES = [
  { value: "single", label: "Enkelt session" },
  { value: "1week", label: "1 uge" },
  { value: "2weeks", label: "2 uger" },
  { value: "3weeks", label: "3 uger" },
  { value: "4weeks", label: "4 uger" },
];

// Map provider id to the settings key for "has key"
function hasKeyForProvider(settings: SystemSettings | null, providerId: string): boolean {
  if (!settings) return false;
  const map: Record<string, keyof SystemSettings> = {
    openai: "hasOpenaiKey",
    anthropic: "hasAnthropicKey",
    google: "hasGoogleKey",
    mistral: "hasMistralKey",
  };
  return !!(settings as any)[map[providerId] ?? ""] ?? false;
}

// Map provider id to the API key field name for PUT
function apiKeyFieldName(providerId: string): string {
  const map: Record<string, string> = {
    openai: "openaiApiKey",
    anthropic: "anthropicApiKey",
    google: "googleApiKey",
    mistral: "mistralApiKey",
  };
  return map[providerId] ?? `${providerId}ApiKey`;
}

export default function AdminSystemSettingsPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("");
  const [dataRange, setDataRange] = useState("2weeks");
  const [budget, setBudget] = useState("");
  const [systemContext, setSystemContext] = useState("");

  // API key state for selected provider
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
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

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
    <div data-testid="admin-system-settings" className="space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Indstillinger</h1>
        <p className="text-sm text-muted-foreground">Konfigurer AI, API-noegler, zone-farver og system-standarder</p>
      </div>

      {/* ── AI Defaults ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          <h2 className="text-base font-semibold text-foreground">AI Standard-indstillinger</h2>
        </div>
        <p className="text-xs text-muted-foreground">Disse indstillinger nedarves af atleter, medmindre de har brugerdefinerede praeferencer.</p>

        {/* Provider + Model row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Standard provider</label>
            <select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(""); setApiKeyValue(""); setShowApiKey(false); }} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              {LLM_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
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

        {/* API Key inline — only for providers that need one */}
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

        {/* Local provider info inline */}
        {provider === "local" && (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              Lokale modeller kraever ingen API-noegle. Soerg for at Ollama koerer paa <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">localhost:11434</code>.
            </p>
          </div>
        )}

        {/* Training data range + budget row */}
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

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Standard system-kontekst (AI persona)</label>
          <textarea value={systemContext} onChange={(e) => setSystemContext(e.target.value)} rows={4} placeholder="Du er en erfaren triathlon-traener..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none" />
        </div>

        <button onClick={handleSaveDefaults} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Gem AI indstillinger
        </button>
      </div>

      {/* ── Calendar & Date Format ──────────────────────────────────── */}
      <DatePickerPreview />

      {/* ── Zone Colors ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-blue-400" />
          <h2 className="text-base font-semibold text-foreground">Zone-farver & Visuel Konfiguration</h2>
        </div>
        <ZoneColorPicker />
      </div>

      {/* ── Sport Config ────────────────────────────────────────────── */}
      {athleteId && <SportConfigEditor athleteId={athleteId} />}

      {/* ── Garmin ──────────────────────────────────────────────────── */}
      {athleteId && <GarminConnection athleteId={athleteId} />}
    </div>
  );
}
