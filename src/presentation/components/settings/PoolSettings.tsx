import { useState, useEffect } from "react";
import { Plus, Trash2, Waves, Eye, EyeOff } from "lucide-react";
import {
  useAthleteProfile,
  useUpdateAthleteProfile,
} from "@/application/hooks/athlete/useAthleteProfile";

interface PoolEntry {
  url: string;
  active: boolean;
}

interface PoolSettingsProps {
  athleteId: string;
}

export default function PoolSettings({ athleteId }: PoolSettingsProps) {
  const { data: profileRes, isLoading } = useAthleteProfile(athleteId);
  const updateMutation = useUpdateAthleteProfile(athleteId);
  const profile = (profileRes as any)?.data ?? profileRes;
  const stored = profile?.poolUrls as PoolEntry[] | null;

  const [pools, setPools] = useState<PoolEntry[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPools(stored ?? []);
    setDirty(false);
  }, [stored]);

  function handleSave() {
    const valid = pools.filter((p) => p.url.trim() !== "");
    updateMutation.mutate(
      { poolUrls: valid.length > 0 ? valid : null },
      { onSuccess: () => setDirty(false) }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg border border-border/50 bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Waves size={14} className="text-cyan-400" />
            Svømmehaller
          </h3>
          <button
            onClick={() => {
              setPools((prev) => [...prev, { url: "", active: true }]);
              setDirty(true);
            }}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus size={12} />
            Tilføj
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Tilføj links til dine svømmehaller for at se driftsinfo på dashboardet.
          Deaktiver en svømmehal for at skjule den midlertidigt.
        </p>

        {pools.length === 0 && (
          <div className="rounded border border-dashed border-border/50 p-3 text-center text-xs text-muted-foreground">
            Ingen svømmehaller tilføjet endnu.
          </div>
        )}

        {pools.map((pool, idx) => (
          <div key={idx} className={`flex items-center gap-2 ${!pool.active ? "opacity-50" : ""}`}>
            <button
              onClick={() => {
                setDirty(true);
                setPools((prev) =>
                  prev.map((p, i) => (i === idx ? { ...p, active: !p.active } : p))
                );
              }}
              title={pool.active ? "Deaktiver" : "Aktiver"}
              className={`rounded p-1.5 transition-colors ${
                pool.active
                  ? "text-emerald-400 hover:bg-emerald-500/10"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {pool.active ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <input
              type="url"
              value={pool.url}
              onChange={(e) => {
                setDirty(true);
                setPools((prev) =>
                  prev.map((p, i) => (i === idx ? { ...p, url: e.target.value } : p))
                );
              }}
              placeholder="https://svoemkbh.kk.dk/svoemmeanlaeg/svoemmehaller/..."
              className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={() => {
                setDirty(true);
                setPools((prev) => prev.filter((_, i) => i !== idx));
              }}
              className="rounded p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!dirty || updateMutation.isPending}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateMutation.isPending ? "Gemmer..." : "Gem"}
        </button>
        {dirty && <span className="text-xs text-muted-foreground">Ugemte ændringer</span>}
      </div>
    </div>
  );
}
