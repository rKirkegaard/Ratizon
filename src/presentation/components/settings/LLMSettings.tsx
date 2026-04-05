import { useState } from "react";
import {
  useLLMSettings,
  useLLMPreferences,
  useUpdateLLMPreferences,
  useLLMUsage,
  useLLMModels,
} from "@/application/hooks/llm/useLLMSettings";
import { Brain, Loader2, AlertCircle } from "lucide-react";

interface LLMSettingsProps {
  athleteId: string | null;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function LLMSettingsComponent({ athleteId }: LLMSettingsProps) {
  const { data: systemSettings, isLoading: sysLoading } = useLLMSettings();
  const { data: prefs, isLoading: prefsLoading } = useLLMPreferences(athleteId);
  const { data: usage } = useLLMUsage(athleteId);
  const { data: models } = useLLMModels();
  const updatePrefs = useUpdateLLMPreferences(athleteId);

  const [editBudget, setEditBudget] = useState<string>("");
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);

  if (sysLoading || prefsLoading) {
    return (
      <div data-testid="llm-settings" className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Henter AI-indstillinger...</span>
        </div>
      </div>
    );
  }

  const currentProvider = prefs?.inheritFromSystem
    ? systemSettings?.defaultProvider ?? "openai"
    : prefs?.preferredProvider ?? systemSettings?.defaultProvider ?? "openai";

  const currentModel = prefs?.inheritFromSystem
    ? systemSettings?.defaultModel ?? "gpt-4o-mini"
    : prefs?.preferredModel ?? systemSettings?.defaultModel ?? "gpt-4o-mini";

  const allModels = models
    ? [...(models.openai || []), ...(models.anthropic || [])]
    : ["gpt-4o-mini", "gpt-4o"];

  const providerModels = models
    ? (currentProvider === "anthropic" ? models.anthropic : models.openai) ?? []
    : allModels;

  return (
    <div data-testid="llm-settings" className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Brain className="h-5 w-5 text-purple-400" />
        <h3 className="text-base font-semibold text-foreground">AI Coach Indstillinger</h3>
      </div>

      {/* Provider & Model */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Arv fra system</label>
          <button
            data-testid="llm-inherit-toggle"
            onClick={() => updatePrefs.mutate({ inheritFromSystem: !prefs?.inheritFromSystem })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              prefs?.inheritFromSystem
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {prefs?.inheritFromSystem ? "Systemindstillinger" : "Brugerdefineret"}
          </button>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Provider</label>
          <select
            data-testid="llm-provider"
            value={currentProvider}
            onChange={(e) => updatePrefs.mutate({ inheritFromSystem: false, preferredProvider: e.target.value })}
            disabled={prefs?.inheritFromSystem}
            className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground disabled:opacity-50"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Model</label>
          <select
            data-testid="llm-model"
            value={currentModel}
            onChange={(e) => updatePrefs.mutate({ inheritFromSystem: false, preferredModel: e.target.value })}
            disabled={prefs?.inheritFromSystem}
            className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground disabled:opacity-50"
          >
            {providerModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Maanedligt budget</label>
          <button
            onClick={() => {
              setEditBudget(prefs?.monthlyBudgetCents ? String(prefs.monthlyBudgetCents / 100) : "");
              setShowBudgetEdit(!showBudgetEdit);
            }}
            className="text-xs text-primary hover:underline"
          >
            {showBudgetEdit ? "Luk" : "Rediger"}
          </button>
        </div>
        <p className="text-sm text-foreground">
          {prefs?.monthlyBudgetCents
            ? formatCents(prefs.monthlyBudgetCents)
            : systemSettings?.globalMonthlyBudgetCents
              ? `${formatCents(systemSettings.globalMonthlyBudgetCents)} (system)`
              : "Ingen graense"}
        </p>
        {showBudgetEdit && (
          <div className="flex gap-2">
            <input
              placeholder="USD pr. maaned (f.eks. 5.00)"
              value={editBudget}
              onChange={(e) => setEditBudget(e.target.value)}
              className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-sm text-foreground"
            />
            <button
              onClick={() => {
                const cents = editBudget ? Math.round(parseFloat(editBudget) * 100) : null;
                updatePrefs.mutate({ monthlyBudgetCents: cents });
                setShowBudgetEdit(false);
              }}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Gem
            </button>
          </div>
        )}
      </div>

      {/* Usage stats */}
      {usage && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Denne maaneds forbrug
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Pris</p>
              <p className="text-lg font-bold text-foreground">{formatCents(usage.currentMonth.totalCostCents)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Tokens</p>
              <p className="text-lg font-bold text-foreground">{usage.currentMonth.totalTokens.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Anmodninger</p>
              <p className="text-lg font-bold text-foreground">{usage.currentMonth.requestCount}</p>
            </div>
          </div>

          {/* Budget bar */}
          {usage.limit.limitCents != null && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Forbrug af budget</span>
                <span className={usage.limit.usagePct > 90 ? "text-red-400" : usage.limit.usagePct > 70 ? "text-amber-400" : "text-green-400"}>
                  {Math.round(usage.limit.usagePct)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    usage.limit.usagePct > 90 ? "bg-red-500" : usage.limit.usagePct > 70 ? "bg-amber-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, usage.limit.usagePct)}%` }}
                />
              </div>
            </div>
          )}

          {usage.limit.usagePct > 90 && usage.limit.limitCents != null && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4" />
              Du er taet paa din maanedlige AI-graense. Overvaej at oege budgettet.
            </div>
          )}

          {/* By provider */}
          {usage.byProvider.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              {usage.byProvider.map((p) => (
                <div key={p.provider} className="flex justify-between">
                  <span className="capitalize">{p.provider}</span>
                  <span>{formatCents(p.costCents)} ({p.requests} anm.)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
