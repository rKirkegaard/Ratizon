import { useState } from "react";
import { Flag, Utensils, ClipboardCheck, BarChart3, Loader2, RefreshCw, Check, ChevronDown } from "lucide-react";
import { apiClient } from "@/application/api/client";
import { useAthleteStore } from "@/application/stores/athleteStore";

interface RaceWeekModuleProps {
  goalId: string;
  goalTitle: string;
}

type Tab = "pacing" | "nutrition" | "checklist" | "debrief";

export default function RaceWeekModule({ goalId, goalTitle }: RaceWeekModuleProps) {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [tab, setTab] = useState<Tab>("pacing");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<Tab, any>>({ pacing: null, nutrition: null, checklist: null, debrief: null });

  async function generate(type: Tab) {
    if (!athleteId) return;
    setLoading(true);
    try {
      const endpoint = type === "pacing" ? "race-pacing" : type === "nutrition" ? "race-nutrition" : type === "checklist" ? "race-checklist" : "race-debrief";
      const res: any = await apiClient.post(`/ai-coaching/${athleteId}/${endpoint}/${goalId}`);
      const d = res?.data ?? res;
      setData((prev) => ({ ...prev, [type]: d }));
    } catch (e: any) {
      setData((prev) => ({ ...prev, [type]: { error: e?.message ?? "Fejl" } }));
    }
    setLoading(false);
  }

  const TABS: Array<{ key: Tab; label: string; icon: typeof Flag }> = [
    { key: "pacing", label: "Pacing", icon: Flag },
    { key: "nutrition", label: "Ernaering", icon: Utensils },
    { key: "checklist", label: "Checklist", icon: ClipboardCheck },
    { key: "debrief", label: "Debrief", icon: BarChart3 },
  ];

  if (!athleteId) return null;

  return (
    <div data-testid="race-week-module" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Flag className="h-5 w-5 text-orange-400" />
        <h2 className="text-base font-semibold text-foreground">Race-Week: {goalTitle}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            data-testid={`rw-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs transition-colors ${
              tab === t.key ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[200px]">
        {!data[tab] ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <p className="text-sm text-muted-foreground">Generer {TABS.find((t) => t.key === tab)?.label} med AI</p>
            <button
              data-testid={`rw-generate-${tab}`}
              onClick={() => generate(tab)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Generer
            </button>
          </div>
        ) : data[tab]?.error ? (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{data[tab].error}</div>
        ) : (
          <div className="space-y-3">
            {data[tab]?.isMock && (
              <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[10px] text-amber-400">Mock data</div>
            )}
            <button onClick={() => generate(tab)} disabled={loading} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />} Generer igen
            </button>

            {/* Pacing */}
            {tab === "pacing" && data.pacing?.pacing && (
              <PacingDisplay pacing={data.pacing.pacing} />
            )}

            {/* Nutrition */}
            {tab === "nutrition" && data.nutrition?.nutrition && (
              <NutritionDisplay nutrition={data.nutrition.nutrition} />
            )}

            {/* Checklist */}
            {tab === "checklist" && data.checklist?.checklist && (
              <ChecklistDisplay checklist={data.checklist.checklist} />
            )}

            {/* Debrief */}
            {tab === "debrief" && data.debrief?.debrief && (
              <DebriefDisplay debrief={data.debrief.debrief} />
            )}

            {/* Fallback: raw content */}
            {data[tab]?.raw && (
              <pre className="text-xs text-foreground whitespace-pre-wrap bg-muted/20 p-3 rounded-lg">{data[tab].raw}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PacingDisplay({ pacing }: { pacing: any }) {
  return (
    <div className="space-y-3">
      {pacing.overallStrategy && <p className="text-sm text-foreground">{pacing.overallStrategy}</p>}
      {["swim", "bike", "run"].map((sport) => {
        const s = pacing[sport];
        if (!s) return null;
        return (
          <div key={sport} className="rounded-lg border border-border p-3">
            <h4 className="text-xs font-semibold text-foreground uppercase mb-1">{sport === "swim" ? "Svoem" : sport === "bike" ? "Cykel" : "Loeb"}</h4>
            {s.targetPace && <p className="text-xs text-muted-foreground">Pace: {s.targetPace}</p>}
            {s.targetPower && <p className="text-xs text-muted-foreground">Power: {s.targetPower}W</p>}
            {s.targetSpeed && <p className="text-xs text-muted-foreground">Hastighed: {s.targetSpeed}</p>}
            {s.strategy && <p className="text-xs text-foreground mt-1">{s.strategy}</p>}
            {s.segments && (
              <div className="mt-2 space-y-1">
                {s.segments.map((seg: any, i: number) => (
                  <div key={i} className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{seg.km}</span>
                    <span>{seg.pace ?? `${seg.power}W`}</span>
                    {seg.note && <span className="text-muted-foreground/60">{seg.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {pacing.transitions && (
        <div className="text-xs text-muted-foreground">
          T1: {pacing.transitions.t1Target}s | T2: {pacing.transitions.t2Target}s
        </div>
      )}
    </div>
  );
}

function NutritionDisplay({ nutrition }: { nutrition: any }) {
  return (
    <div className="space-y-3">
      {nutrition.preRace && (
        <div className="rounded-lg border border-border p-3">
          <h4 className="text-xs font-semibold text-foreground mb-1">Foer race ({nutrition.preRace.timing})</h4>
          <p className="text-xs text-muted-foreground">{nutrition.preRace.calories} kcal, {nutrition.preRace.carbs_g}g kulhydrat, {nutrition.preRace.fluid_ml}ml vaeske</p>
          {nutrition.preRace.foods && <p className="text-[10px] text-muted-foreground mt-1">{nutrition.preRace.foods.join(", ")}</p>}
        </div>
      )}
      {["bike", "run"].map((sport) => {
        const s = nutrition[sport];
        if (!s || !s.calories_per_hour) return null;
        return (
          <div key={sport} className="rounded-lg border border-border p-3">
            <h4 className="text-xs font-semibold text-foreground mb-1">{sport === "bike" ? "Cykel" : "Loeb"}</h4>
            <p className="text-xs text-muted-foreground">{s.calories_per_hour} kcal/t, {s.carbs_per_hour}g CHO/t, {s.fluid_per_hour_ml}ml/t</p>
            {s.plan && s.plan.map((p: any, i: number) => (
              <p key={i} className="text-[10px] text-muted-foreground">{p.time}: {p.intake}</p>
            ))}
          </div>
        );
      })}
      {nutrition.postRace && (
        <div className="rounded-lg border border-border p-3">
          <h4 className="text-xs font-semibold text-foreground mb-1">Efter race ({nutrition.postRace.timing})</h4>
          <p className="text-xs text-muted-foreground">{nutrition.postRace.protein_g}g protein, {nutrition.postRace.carbs_g}g kulhydrat, {nutrition.postRace.fluid_ml}ml</p>
        </div>
      )}
    </div>
  );
}

function ChecklistDisplay({ checklist }: { checklist: any[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  function toggle(key: string) {
    setChecked((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  return (
    <div className="space-y-3">
      {checklist.map((cat: any, ci: number) => (
        <div key={ci}>
          <h4 className="text-xs font-semibold text-foreground mb-1">{cat.category}</h4>
          <div className="space-y-1">
            {(cat.items ?? []).map((item: string, ii: number) => {
              const key = `${ci}-${ii}`;
              return (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={checked.has(key)} onChange={() => toggle(key)} className="rounded border-border" />
                  <span className={checked.has(key) ? "line-through text-muted-foreground" : "text-foreground"}>{item}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">{checked.size} af {checklist.reduce((s, c) => s + (c.items?.length ?? 0), 0)} gennemfoert</p>
    </div>
  );
}

function DebriefDisplay({ debrief }: { debrief: any }) {
  return (
    <div className="space-y-3">
      {debrief.overallAssessment && <p className="text-sm text-foreground">{debrief.overallAssessment}</p>}
      {debrief.planVsActual && <p className="text-xs text-muted-foreground">{debrief.planVsActual}</p>}
      {debrief.wentWell?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-emerald-400 mb-1">Gik godt</h4>
          {debrief.wentWell.map((w: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground flex gap-1"><span className="text-emerald-400">+</span> {w}</p>
          ))}
        </div>
      )}
      {debrief.couldImprove?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-400 mb-1">Kan forbedres</h4>
          {debrief.couldImprove.map((c: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground flex gap-1"><span className="text-amber-400">!</span> {c}</p>
          ))}
        </div>
      )}
      {debrief.recommendations?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-blue-400 mb-1">Anbefalinger</h4>
          {debrief.recommendations.map((r: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground flex gap-1"><span className="text-blue-400">→</span> {r}</p>
          ))}
        </div>
      )}
    </div>
  );
}
