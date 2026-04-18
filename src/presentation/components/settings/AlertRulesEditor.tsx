import { useState } from "react";
import { ShieldAlert, Plus, Trash2, Save, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  useAlertRules,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
} from "@/application/hooks/ai-coaching/useAICoaching";

interface AlertRulesEditorProps {
  athleteId: string;
}

const RULE_TYPES = [
  { value: "overtraining", label: "Overtraening", desc: "TSB-baseret", thresholdKeys: ["warning", "critical"], unit: "TSB" },
  { value: "injury_risk", label: "Skadesrisiko", desc: "Ramp rate pr. uge", thresholdKeys: ["warning", "critical"], unit: "CTL/uge" },
  { value: "undertraining", label: "Undertraening", desc: "Hviledage i traek", thresholdKeys: ["info", "warning", "critical"], unit: "dage" },
  { value: "hrv_drop", label: "HRV-fald", desc: "% fra baseline", thresholdKeys: ["warning", "critical"], unit: "%" },
  { value: "sleep", label: "Soevnmangel", desc: "Ugentligt gennemsnit", thresholdKeys: ["warning", "critical"], unit: "timer" },
  { value: "monotony", label: "Monotoni", desc: "Traeningsvariation", thresholdKeys: ["warning", "critical"], unit: "score" },
  { value: "rpe_mismatch", label: "RPE-uoverensstemmelse", desc: "RPE vs. belastning", thresholdKeys: ["warning", "critical"], unit: "forskel" },
  { value: "custom", label: "Brugerdefineret", desc: "Tilpasset regel", thresholdKeys: ["warning", "critical"], unit: "" },
];

const DEFAULT_THRESHOLDS: Record<string, Record<string, number>> = {
  overtraining: { warning: -20, critical: -30 },
  injury_risk: { warning: 7, critical: 10 },
  undertraining: { info: 3, warning: 5, critical: 7 },
  hrv_drop: { warning: 15, critical: 25 },
  sleep: { warning: 7.0, critical: 6.5 },
  monotony: { warning: 1.5, critical: 2.0 },
  rpe_mismatch: { warning: 3, critical: 5 },
  custom: { warning: 0, critical: 0 },
};

export default function AlertRulesEditor({ athleteId }: AlertRulesEditorProps) {
  const { data: rawRules, isLoading } = useAlertRules(athleteId);
  const createMutation = useCreateAlertRule(athleteId);
  const updateMutation = useUpdateAlertRule(athleteId);
  const deleteMutation = useDeleteAlertRule(athleteId);

  const rules = ((rawRules as any)?.data ?? rawRules ?? []) as any[];

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("overtraining");
  const [newThresholds, setNewThresholds] = useState<Record<string, number>>(DEFAULT_THRESHOLDS.overtraining);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editThresholds, setEditThresholds] = useState<Record<string, number>>({});

  function handleTypeChange(type: string) {
    setNewType(type);
    setNewThresholds({ ...(DEFAULT_THRESHOLDS[type] ?? DEFAULT_THRESHOLDS.custom) });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate(
      { ruleName: newName.trim(), ruleType: newType, thresholds: newThresholds, enabled: true },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewType("overtraining");
          setNewThresholds(DEFAULT_THRESHOLDS.overtraining);
        },
      }
    );
  }

  function handleToggle(rule: any) {
    updateMutation.mutate({ ruleId: rule.id, enabled: !rule.enabled });
  }

  function handleStartEdit(rule: any) {
    setEditingId(rule.id);
    setEditThresholds(typeof rule.thresholds === "object" ? { ...rule.thresholds } : {});
  }

  function handleSaveEdit(ruleId: string) {
    updateMutation.mutate(
      { ruleId, thresholds: editThresholds },
      { onSuccess: () => setEditingId(null) }
    );
  }

  function handleDelete(ruleId: string) {
    if (!confirm("Slet denne regel?")) return;
    deleteMutation.mutate(ruleId);
  }

  const ruleTypeMeta = (type: string) => RULE_TYPES.find((r) => r.value === type) ?? RULE_TYPES[RULE_TYPES.length - 1];

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />;
  }

  return (
    <div data-testid="alert-rules-editor" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-semibold text-foreground">Alert-regler</h2>
        </div>
        <button
          data-testid="add-alert-rule"
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50"
        >
          <Plus size={14} /> Ny regel
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Konfigurer graensevaerdier for automatiske advarsler.</p>

      {/* Create form */}
      {showCreate && (
        <div data-testid="create-rule-form" className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Regelnavn</label>
              <input
                data-testid="rule-name-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="F.eks. Min overtraening-regel"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Regeltype</label>
              <select
                data-testid="rule-type-select"
                value={newType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {RULE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label} — {rt.desc}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Graensevaerdier ({ruleTypeMeta(newType).unit})</label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(newThresholds).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium ${key === "critical" ? "text-red-400" : key === "warning" ? "text-amber-400" : "text-blue-400"}`}>
                    {key === "critical" ? "Kritisk" : key === "warning" ? "Advarsel" : "Info"}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={val}
                    onChange={(e) => setNewThresholds({ ...newThresholds, [key]: parseFloat(e.target.value) || 0 })}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              data-testid="save-new-rule"
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Opret
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Ingen brugerdefinerede regler. Systemets standardregler er aktive.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule: any) => {
            const meta = ruleTypeMeta(rule.ruleType);
            const isEditing = editingId === rule.id;
            const thresholds = typeof rule.thresholds === "object" ? rule.thresholds : {};

            return (
              <div
                key={rule.id}
                data-testid={`rule-${rule.id}`}
                className={`rounded-lg border px-4 py-3 transition-colors ${
                  rule.enabled ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      data-testid={`toggle-rule-${rule.id}`}
                      onClick={() => handleToggle(rule)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {rule.enabled ? <ToggleRight size={20} className="text-primary" /> : <ToggleLeft size={20} />}
                    </button>
                    <div>
                      <span className="text-sm font-medium text-foreground">{rule.ruleName}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">{meta.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(rule)}
                        className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                      >
                        Rediger
                      </button>
                    )}
                    <button
                      data-testid={`delete-rule-${rule.id}`}
                      onClick={() => handleDelete(rule.id)}
                      className="rounded px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    {Object.entries(editThresholds).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${key === "critical" ? "text-red-400" : key === "warning" ? "text-amber-400" : "text-blue-400"}`}>
                          {key === "critical" ? "Kritisk" : key === "warning" ? "Advarsel" : "Info"}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={val}
                          onChange={(e) => setEditThresholds({ ...editThresholds, [key]: parseFloat(e.target.value) || 0 })}
                          className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => handleSaveEdit(rule.id)}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {updateMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                      Gem
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:text-foreground">Annuller</button>
                  </div>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(thresholds).map(([key, val]) => (
                      <span
                        key={key}
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                          key === "critical"
                            ? "border-red-500/20 bg-red-500/10 text-red-400"
                            : key === "warning"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : "border-blue-500/20 bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {key === "critical" ? "Kritisk" : key === "warning" ? "Advarsel" : "Info"}: {String(val)} {meta.unit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
