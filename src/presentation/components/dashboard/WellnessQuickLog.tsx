import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import type { WellnessLogPayload } from "@/application/hooks/useDashboard";

interface WellnessQuickLogProps {
  loggedToday: boolean;
  onSubmit: (payload: WellnessLogPayload) => void;
  isSubmitting: boolean;
  submitSuccess: boolean;
}

export default function WellnessQuickLog({
  loggedToday,
  onSubmit,
  isSubmitting,
  submitSuccess,
}: WellnessQuickLogProps) {
  const [expanded, setExpanded] = useState(!loggedToday);
  const [form, setForm] = useState({
    hrv: "",
    resting_hr: "",
    sleep_hours: "",
    sleep_quality: "5",
    stress: "5",
    body_battery: "50",
    motivation: "5",
  });

  useEffect(() => {
    if (submitSuccess) {
      setExpanded(false);
    }
  }, [submitSuccess]);

  if (loggedToday && !expanded) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      hrv: Number(form.hrv),
      resting_hr: Number(form.resting_hr),
      sleep_hours: Number(form.sleep_hours),
      sleep_quality: Number(form.sleep_quality),
      stress: Number(form.stress),
      body_battery: Number(form.body_battery),
      motivation: Number(form.motivation),
    });
  };

  const canSubmit =
    form.hrv !== "" && form.resting_hr !== "" && form.sleep_hours !== "";

  return (
    <div
      data-testid="wellness-quick-log"
      className="rounded-lg border border-primary/30 bg-card"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-primary">
          Wellness Quick-Log
        </span>
        {expanded ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="border-t border-border/50 px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {/* HRV */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                HRV (ms)
              </label>
              <input
                data-testid="wellness-hrv-input"
                type="number"
                min="0"
                max="300"
                value={form.hrv}
                onChange={(e) => handleChange("hrv", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                placeholder="f.eks. 62"
              />
            </div>

            {/* Hvilepuls */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Hvilepuls (bpm)
              </label>
              <input
                data-testid="wellness-hr-input"
                type="number"
                min="20"
                max="120"
                value={form.resting_hr}
                onChange={(e) => handleChange("resting_hr", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                placeholder="f.eks. 48"
              />
            </div>

            {/* Sovn timer */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Sovn (timer)
              </label>
              <input
                data-testid="wellness-sleep-input"
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={form.sleep_hours}
                onChange={(e) => handleChange("sleep_hours", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                placeholder="f.eks. 7.5"
              />
            </div>

            {/* Sovnkvalitet */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Sovnkvalitet (1-10)
              </label>
              <div className="flex items-center gap-2">
                <input
                  data-testid="wellness-sleep-quality-input"
                  type="range"
                  min="1"
                  max="10"
                  value={form.sleep_quality}
                  onChange={(e) => handleChange("sleep_quality", e.target.value)}
                  className="flex-1"
                />
                <span className="w-5 text-center text-xs text-foreground">
                  {form.sleep_quality}
                </span>
              </div>
            </div>

            {/* Stress */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Stress (1-10)
              </label>
              <div className="flex items-center gap-2">
                <input
                  data-testid="wellness-stress-input"
                  type="range"
                  min="1"
                  max="10"
                  value={form.stress}
                  onChange={(e) => handleChange("stress", e.target.value)}
                  className="flex-1"
                />
                <span className="w-5 text-center text-xs text-foreground">
                  {form.stress}
                </span>
              </div>
            </div>

            {/* Body Battery */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Body Battery (0-100)
              </label>
              <input
                data-testid="wellness-battery-input"
                type="number"
                min="0"
                max="100"
                value={form.body_battery}
                onChange={(e) => handleChange("body_battery", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                placeholder="f.eks. 65"
              />
            </div>

            {/* Motivation */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Motivation (1-10)
              </label>
              <div className="flex items-center gap-2">
                <input
                  data-testid="wellness-motivation-input"
                  type="range"
                  min="1"
                  max="10"
                  value={form.motivation}
                  onChange={(e) => handleChange("motivation", e.target.value)}
                  className="flex-1"
                />
                <span className="w-5 text-center text-xs text-foreground">
                  {form.motivation}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              data-testid="wellness-submit"
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              {isSubmitting ? "Logger..." : "Log wellness"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
