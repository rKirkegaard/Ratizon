import { useState } from "react";
import { Gauge, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

interface RPEInputProps {
  sessionId: number;
  currentRpe: number | null;
}

const RPE_DESCRIPTIONS: Record<number, string> = {
  1: "Meget let", 2: "Let", 3: "Moderat let", 4: "Moderat",
  5: "Noget haardt", 6: "Haardt", 7: "Meget haardt", 8: "Ekstremt haardt",
  9: "Naesten max", 10: "Maksimal anstrengelse",
};

const RPE_COLORS: Record<number, string> = {
  1: "bg-blue-500", 2: "bg-blue-400", 3: "bg-emerald-500", 4: "bg-emerald-400",
  5: "bg-yellow-500", 6: "bg-amber-500", 7: "bg-orange-500", 8: "bg-red-400",
  9: "bg-red-500", 10: "bg-red-600",
};

export default function RPEInput({ sessionId, currentRpe }: RPEInputProps) {
  const [rpe, setRpe] = useState<number | null>(currentRpe);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (value: number) => apiClient.put(`/training/sessions/${sessionId}`, { rpe: value }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["session-detail"] });
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function handleSelect(value: number) {
    setRpe(value);
    saveMutation.mutate(value);
  }

  return (
    <div data-testid="rpe-input" className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-foreground">RPE — Oplevet belastning</h3>
        {saved && <span className="text-[10px] text-emerald-400 ml-auto">Gemt!</span>}
        {saveMutation.isPending && <Loader2 size={12} className="animate-spin ml-auto text-muted-foreground" />}
      </div>

      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            data-testid={`rpe-${v}`}
            onClick={() => handleSelect(v)}
            className={`flex-1 rounded-md py-2 text-xs font-bold transition-all ${
              rpe === v
                ? `${RPE_COLORS[v]} text-white scale-105`
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {rpe && (
        <p className="text-xs text-muted-foreground text-center">
          RPE {rpe}: {RPE_DESCRIPTIONS[rpe]}
        </p>
      )}
    </div>
  );
}
