import { Brain, TrendingUp, TrendingDown, Minus, Activity, MessageSquare, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import { useAthleteStore } from "@/application/stores/athleteStore";

const RISK_CONFIG = {
  low: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Lav" },
  moderate: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Moderat" },
  high: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Hoej" },
};

function TrendArrow({ value }: { value: number | null }) {
  if (value == null) return <Minus size={12} className="text-muted-foreground" />;
  if (value > 0.05) return <TrendingUp size={12} className="text-emerald-400" />;
  if (value < -0.05) return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-blue-400" />;
}

export default function MentalReadinessPanel() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["mental-readiness", athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/mental-readiness`),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });

  const report = (rawData as any)?.data ?? rawData;

  if (!athleteId) return null;
  if (isLoading) return <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />;
  if (!report) return null;

  const risk = RISK_CONFIG[report.burnoutRisk as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.low;

  return (
    <div data-testid="mental-readiness-panel" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-400" />
          <h2 className="text-base font-semibold text-foreground">Mental Readiness</h2>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${risk.bg}`}>
          Burnout-risiko: {risk.label}
        </span>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendArrow value={report.motivationTrend} />
            <span className="text-xs text-muted-foreground">Motivation</span>
          </div>
          <div className="text-sm font-bold text-foreground">
            {report.motivationTrend != null ? (report.motivationTrend > 0 ? "+" : "") + (report.motivationTrend * 100).toFixed(0) + "%" : "—"}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendArrow value={report.energyTrend} />
            <span className="text-xs text-muted-foreground">Energi</span>
          </div>
          <div className="text-sm font-bold text-foreground">
            {report.energyTrend != null ? (report.energyTrend > 0 ? "+" : "") + (report.energyTrend * 100).toFixed(0) + "%" : "—"}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendArrow value={report.stressTrend != null ? -report.stressTrend : null} />
            <span className="text-xs text-muted-foreground">Stress</span>
          </div>
          <div className="text-sm font-bold text-foreground">
            {report.stressTrend != null ? (report.stressTrend > 0 ? "+" : "") + (report.stressTrend * 100).toFixed(0) + "%" : "—"}
          </div>
        </div>
      </div>

      {/* Engagement */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Engagement</span>
          <span>{report.engagementScore}/100</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              report.engagementScore > 60 ? "bg-emerald-500" : report.engagementScore > 30 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${report.engagementScore}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Activity size={12} /> {report.uploadFrequency} sess/uge</span>
        <span className="flex items-center gap-1"><MessageSquare size={12} /> {report.chatActivity} beskeder (14d)</span>
        {report.daysSinceLastUpload != null && (
          <span className={`flex items-center gap-1 ${report.daysSinceLastUpload >= 5 ? "text-red-400" : ""}`}>
            {report.daysSinceLastUpload === 0 ? "Upload i dag" : `${report.daysSinceLastUpload}d siden upload`}
          </span>
        )}
      </div>

      {/* Indicators */}
      {report.indicators.length > 0 && (
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-400">Indikatorer</span>
          </div>
          <ul className="space-y-0.5">
            {report.indicators.map((ind: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground">• {ind}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
