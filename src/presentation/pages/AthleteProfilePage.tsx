import { useState, useEffect } from "react";
import { useAuthStore } from "@/application/stores/authStore";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useAthleteProfile,
  useUpdateAthleteProfile,
} from "@/application/hooks/athlete/useAthleteProfile";
import { apiClient } from "@/application/api/client";
import AthleteProfile from "@/presentation/components/settings/AthleteProfile";
import LLMSettings from "@/presentation/components/settings/LLMSettings";
import TrainingZones from "@/presentation/components/settings/TrainingZones";
import { Copy, Check, ChevronDown, Search } from "lucide-react";

interface AthleteOption {
  athleteId: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

type Tab = "data" | "zones" | "ai";

export default function AthleteProfilePage() {
  const currentUser = useAuthStore((s) => s.user);
  const { selectedAthleteId, setSelectedAthleteId } = useAthleteStore();
  const canSelectAthlete = currentUser?.role === "coach" || currentUser?.role === "admin";

  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    apiClient.get<any>("/athletes").then((data) => {
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setAthletes(list);
      // Auto-select first athlete if none selected
      if (!selectedAthleteId && list.length > 0) {
        setSelectedAthleteId(list[0].athleteId);
      }
    }).catch(() => {});
  }, [selectedAthleteId]);

  const athleteId = selectedAthleteId;
  const { data: profileData, isLoading: profileLoading } = useAthleteProfile(athleteId);
  const updateProfileMutation = useUpdateAthleteProfile(athleteId);
  const profile = profileData?.data ?? (profileData as any) ?? null;

  const [tab, setTab] = useState<Tab>("data");
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (!athleteId) return;
    navigator.clipboard.writeText(athleteId).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const selectedAthlete = athletes.find((a) => a.athleteId === athleteId);
  const selectedName = selectedAthlete
    ? selectedAthlete.firstName && selectedAthlete.lastName
      ? `${selectedAthlete.firstName} ${selectedAthlete.lastName}`
      : selectedAthlete.displayName
    : profile?.displayName ?? "Ukendt";

  const filteredAthletes = athletes.filter((a) => {
    if (!athleteSearch) return true;
    const q = athleteSearch.toLowerCase();
    const name = a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.displayName;
    return name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  if (!athleteId) {
    return (
      <div data-testid="athlete-profile-page" className="p-4 md:p-6">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Atlet Indstillinger</h1>
        <p className="mb-6 text-sm text-muted-foreground">Administrer atletdata og praeferencer</p>
        {canSelectAthlete && athletes.length > 0 ? (
          <div className="space-y-3">
            <label className="block text-xs text-muted-foreground">Vaelg atlet</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {athletes.map((a) => {
                const name = a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.displayName;
                return (
                  <button key={a.athleteId} onClick={() => setSelectedAthleteId(a.athleteId)} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-accent/50 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-foreground">{name.charAt(0)}</div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{name}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <p className="text-sm text-muted-foreground">Vaelg en atlet for at se indstillinger.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="athlete-profile-page" className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Atlet Indstillinger</h1>
        <p className="text-sm text-muted-foreground">Administrer atletdata og praeferencer</p>
      </div>

      {/* Athlete selector (coaches/admins with multiple athletes) */}
      {canSelectAthlete && athletes.length > 0 && (
        <div className="relative" data-testid="settings-athlete-selector">
          <button
            onClick={() => setSelectorOpen(!selectorOpen)}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 w-full max-w-md hover:bg-accent/30 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-foreground">{selectedName.charAt(0)}</div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-foreground">{selectedName}</div>
              <div className="text-xs text-muted-foreground">{selectedAthlete?.email ?? ""}</div>
            </div>
            <ChevronDown size={16} className={`text-muted-foreground transition-transform ${selectorOpen ? "rotate-180" : ""}`} />
          </button>
          {selectorOpen && (
            <div className="absolute z-20 mt-1 w-full max-w-md rounded-lg border border-border bg-card p-2 shadow-lg">
              <div className="flex items-center gap-2 border-b border-border pb-2 mb-2 px-2">
                <Search size={14} className="text-muted-foreground" />
                <input type="text" value={athleteSearch} onChange={(e) => setAthleteSearch(e.target.value)} placeholder="Soeg efter atlet..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" autoFocus />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {filteredAthletes.map((a) => {
                  const name = a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.displayName;
                  const isActive = a.athleteId === athleteId;
                  return (
                    <button key={a.athleteId} onClick={() => { setSelectedAthleteId(a.athleteId); setSelectorOpen(false); setAthleteSearch(""); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-foreground">{name.charAt(0)}</div>
                      <div className="flex-1 text-left">
                        <div className="text-sm">{name}</div>
                        <div className="text-[10px] text-muted-foreground">{a.email}</div>
                      </div>
                      {isActive && <Check size={14} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Athlete ID display */}
      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/50 p-3">
        <span className="text-sm text-muted-foreground">Atlet-ID (til import):</span>
        <code className="rounded bg-background px-2 py-1 text-xs font-mono text-foreground">{athleteId}</code>
        <button onClick={handleCopyId} className="rounded p-1 text-muted-foreground hover:text-foreground">
          {copiedId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: "data" as Tab, label: "Atlet Data" },
          { key: "zones" as Tab, label: "Traeningszoner" },
          { key: "ai" as Tab, label: "AI Brug" },
        ]).map((t) => (
          <button key={t.key} data-testid={`athlete-tab-${t.key}`} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "data" && (
        <AthleteProfile
          profile={profile}
          isLoading={profileLoading}
          isSaving={updateProfileMutation.isPending}
          onSave={(payload) => updateProfileMutation.mutate(payload)}
        />
      )}

      {tab === "zones" && (
        <TrainingZones athleteId={athleteId} />
      )}

      {tab === "ai" && (
        <LLMSettings athleteId={athleteId} />
      )}
    </div>
  );
}
