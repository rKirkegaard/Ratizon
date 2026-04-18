import { useState } from "react";
import { Utensils, Loader2, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import { useAthleteStore } from "@/application/stores/athleteStore";

export default function NutritionDashboard() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [plan, setPlan] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: () => apiClient.post(`/ai-coaching/${athleteId}/nutrition-plan`),
    onSuccess: (res: any) => setPlan(res?.data ?? res),
  });

  if (!athleteId) return null;

  return (
    <div data-testid="nutrition-dashboard" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-green-400" />
          <h2 className="text-base font-semibold text-foreground">Ernaeringsplan</h2>
        </div>
        <button
          data-testid="generate-nutrition"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {generateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {plan ? "Generer igen" : "Generer"}
        </button>
      </div>

      {!plan ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Klik "Generer" for at faa en AI-baseret ernaeringsplan.</p>
      ) : (
        <div className="space-y-4">
          {plan.isMock && (
            <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[10px] text-amber-400">Mock data</div>
          )}

          {plan.bmr && (
            <p className="text-xs text-muted-foreground">BMR: {plan.bmr} kcal</p>
          )}

          {plan.plan?.dailyCalories && (
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                <div className="text-lg font-bold text-foreground">{plan.plan.dailyCalories}</div>
                <div className="text-[10px] text-muted-foreground">kcal/dag</div>
              </div>
              {plan.plan.macros && (
                <>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                    <div className="text-lg font-bold text-blue-400">{plan.plan.macros.carbsG}g</div>
                    <div className="text-[10px] text-muted-foreground">Kulhydrat</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                    <div className="text-lg font-bold text-red-400">{plan.plan.macros.proteinG}g</div>
                    <div className="text-[10px] text-muted-foreground">Protein</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                    <div className="text-lg font-bold text-amber-400">{plan.plan.macros.fatG}g</div>
                    <div className="text-[10px] text-muted-foreground">Fedt</div>
                  </div>
                </>
              )}
            </div>
          )}

          {plan.plan?.mealPlan && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">Maaltidsplan</h3>
              <div className="space-y-1.5">
                {plan.plan.mealPlan.map((meal: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border bg-muted/10 px-3 py-2">
                    <div>
                      <span className="text-xs font-medium text-foreground">{meal.meal}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{meal.time}</span>
                      {meal.description && <p className="text-[10px] text-muted-foreground mt-0.5">{meal.description}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{meal.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.plan?.hydration && (
            <div className="text-xs text-muted-foreground">
              Vaeske: {plan.plan.hydration.dailyMl}ml/dag {plan.plan.hydration.note && `— ${plan.plan.hydration.note}`}
            </div>
          )}

          {plan.plan?.raw && (
            <pre className="text-xs text-foreground whitespace-pre-wrap bg-muted/20 p-3 rounded-lg">{plan.plan.raw}</pre>
          )}
        </div>
      )}
    </div>
  );
}
