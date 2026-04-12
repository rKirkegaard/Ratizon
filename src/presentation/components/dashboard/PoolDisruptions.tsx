import { useEffect, useState } from "react";
import { AlertTriangle, Waves } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useAthleteProfile } from "@/application/hooks/athlete/useAthleteProfile";

interface Disruption {
  title: string;
  text: string;
}

interface PoolResult {
  name: string;
  disruptions: Disruption[];
}

function extractPoolName(url: string): string {
  const parts = url.replace(/\/$/, "").split("/");
  const slug = parts[parts.length - 1] || "Svømmehal";
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PoolDisruptions() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: profileRes } = useAthleteProfile(athleteId);
  const profile = (profileRes as any)?.data ?? profileRes;
  const poolEntries = profile?.poolUrls as
    | { url: string; active: boolean }[]
    | null;

  const activeUrls = poolEntries?.filter((p) => p.active).map((p) => p.url) ?? [];

  const [results, setResults] = useState<PoolResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeUrls.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      activeUrls.map(async (url) => {
        try {
          const res = await fetch(
            `/api/pool-status/check?url=${encodeURIComponent(url)}`
          );
          const data = await res.json();
          return {
            name: extractPoolName(url),
            disruptions: data.disruptions || [],
          } as PoolResult;
        } catch {
          return { name: extractPoolName(url), disruptions: [] };
        }
      })
    )
      .then((r) => setResults(r.filter((p) => p.disruptions.length > 0)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrls.join(",")]);

  if (loading || results.length === 0) return null;

  return (
    <div className="space-y-2">
      {results.map((pool, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4"
        >
          <div className="mt-0.5 rounded-full p-1.5 bg-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-foreground">
                {pool.name}
              </span>
              <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400 border border-yellow-500/30">
                Driftsinfo
              </span>
            </div>
            <ul className="space-y-0.5">
              {pool.disruptions.map((d, j) => (
                <li key={j} className="text-sm text-muted-foreground">
                  {d.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
