import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useSessions,
  type SessionRange,
} from "@/application/hooks/training/useSessions";
import SessionList from "@/presentation/components/training/SessionList";

const RANGE_OPTIONS: { value: SessionRange; label: string }[] = [
  { value: "30d", label: "30 dage" },
  { value: "90d", label: "90 dage" },
  { value: "all", label: "Al tid" },
];

export default function SessionsPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const activeSports = useAthleteStore((s) => s.getActiveSports)();

  const [range, setRange] = useState<SessionRange>("30d");
  const [sportFilter, setSportFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError } = useSessions(athleteId, range, sportFilter);

  const sessions = data?.sessions ?? [];

  return (
    <div data-testid="sessions-page" className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Sessioner</h1>

        {/* Period selector */}
        <div data-testid="period-selector" className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              data-testid={`period-${opt.value}`}
              onClick={() => setRange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sport filter */}
      <div data-testid="sport-filter" className="flex flex-wrap gap-2">
        <button
          data-testid="sport-filter-all"
          onClick={() => setSportFilter("all")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            sportFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Alle
        </button>
        {activeSports.map((sc) => (
          <button
            key={sc.sport_key}
            data-testid={`sport-filter-${sc.sport_key}`}
            onClick={() => setSportFilter(sc.sport_key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              sportFilter === sc.sport_key
                ? "text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            style={
              sportFilter === sc.sport_key
                ? { backgroundColor: sc.color }
                : undefined
            }
          >
            {sc.display_name}
          </button>
        ))}
      </div>

      {/* Error */}
      {isError && (
        <div
          data-testid="sessions-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600"
        >
          Der opstod en fejl ved hentning af sessioner. Proev igen senere.
        </div>
      )}

      {/* No athlete */}
      {!athleteId && (
        <div
          data-testid="sessions-no-athlete"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16"
        >
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se sessioner.
          </p>
        </div>
      )}

      {/* Session list */}
      {athleteId && (
        <SessionList
          sessions={sessions}
          athleteId={athleteId}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}
    </div>
  );
}
