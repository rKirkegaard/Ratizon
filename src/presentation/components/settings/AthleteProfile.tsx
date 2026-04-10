import { useState, useEffect, useRef } from "react";
import { Pencil, X, Heart, Zap, Footprints, Waves, Brain, RefreshCw, Clock, type LucideIcon } from "lucide-react";
import { apiClient } from "@/application/api/client";
import { parseMssToPaceSec, paceSecToMss } from "@/domain/utils/paceUtils";
import type {
  AthleteProfileData,
  ProfileUpdatePayload,
} from "@/application/hooks/athlete/useAthleteProfile";

// Pace helpers imported from @/domain/utils/paceUtils
const secsToMSS = paceSecToMss;
const mssToSecs = parseMssToPaceSec;

// ── Types ─────────────────────────────────────────────────────────────

interface AthleteProfileProps {
  profile: AthleteProfileData | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (payload: ProfileUpdatePayload) => void;
}

export default function AthleteProfile({ profile, isLoading, isSaving, onSave }: AthleteProfileProps) {
  const [form, setForm] = useState<ProfileUpdatePayload>({});
  const [dirty, setDirty] = useState(false);
  const [paceRun, setPaceRun] = useState("");
  const [paceCss, setPaceCss] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName,
        email: profile.email,
        maxHr: profile.maxHr,
        ftp: profile.ftp,
        lthr: profile.lthr,
        swimCss: profile.swimCss,
        restingHr: profile.restingHr,
        weight: profile.weight,
        runThresholdPace: profile.runThresholdPace,
        height: profile.height,
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : null,
        gender: profile.gender,
        trainingPhilosophy: profile.trainingPhilosophy,
        weeklyVolumeMin: profile.weeklyVolumeMin,
        weeklyVolumeMax: profile.weeklyVolumeMax,
        cycleType: (profile as any).cycleType,
      });
      setPaceRun(typeof profile.runThresholdPace === "string" ? profile.runThresholdPace : secsToMSS(profile.runThresholdPace));
      setPaceCss(secsToMSS(profile.swimCss));
      setImageUrl((profile as any).profileImageUrl ?? null);
      setDirty(false);
    }
  }, [profile]);

  function handleChange(field: keyof ProfileUpdatePayload, value: string) {
    setDirty(true);
    const numericFields = ["maxHr", "ftp", "lthr", "swimCss", "restingHr", "weight", "runThresholdPace", "height", "weeklyVolumeMin", "weeklyVolumeMax"];
    if (numericFields.includes(field)) {
      setForm((prev) => ({ ...prev, [field]: value === "" ? null : Number(value) }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  }

  function handlePaceChange(field: "runThresholdPace" | "swimCss", display: string) {
    setDirty(true);
    if (field === "runThresholdPace") {
      setPaceRun(display);
      setForm((prev) => ({ ...prev, [field]: display }));  // Store as M:SS string
    } else {
      setPaceCss(display);
      const secs = mssToSecs(display);
      setForm((prev) => ({ ...prev, [field]: secs }));  // CSS still as seconds
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    setDirty(false);
  }

  // Profile image handlers — convert to base64 data URI and POST as JSON
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const dataUri = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const res: any = await apiClient.post(`/athletes/${profile.id}/profile-image`, { image: dataUri });
      setImageUrl(res?.url ?? res?.data?.url ?? dataUri);
    } catch { /* ignore */ }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImageRemove = async () => {
    if (!profile) return;
    await apiClient.delete(`/athletes/${profile.id}/profile-image`).catch(() => {});
    setImageUrl(null);
  };

  if (isLoading) {
    return (
      <div data-testid="athlete-profile-form" className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg border border-border/50 bg-muted" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div data-testid="athlete-profile-form" className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">Kunne ikke hente atletprofil.</p>
      </div>
    );
  }

  const initials = (profile.displayName || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const PHILOSOPHY_OPTIONS = [
    { value: "", label: "Vaelg filosofi..." },
    { value: "balanced", label: "Balanceret" },
    { value: "polarized", label: "Polariseret (80/20)" },
    { value: "pyramidal", label: "Pyramidal" },
    { value: "threshold", label: "Threshold-fokuseret" },
    { value: "sweet_spot", label: "Sweet Spot" },
    { value: "norwegian", label: "Norsk metode" },
    { value: "hybrid", label: "Hybrid" },
  ];

  const GENDER_OPTIONS = [
    { value: "", label: "Vaelg..." },
    { value: "male", label: "Mand" },
    { value: "female", label: "Kvinde" },
    { value: "other", label: "Andet" },
  ];

  const CYCLE_OPTIONS = [
    { value: "", label: "Vaelg..." },
    { value: "3:1", label: "3:1 (3 uger build, 1 uge recovery)" },
    { value: "2:1", label: "2:1 (2 uger build, 1 uge recovery)" },
    { value: "4:1", label: "4:1 (4 uger build, 1 uge recovery)" },
  ];

  type FieldDef = {
    key: keyof ProfileUpdatePayload;
    label: string;
    type: string;
    unit?: string;
    placeholder?: string;
    step?: string;
    options?: { value: string; label: string }[];
    group: string;
    icon?: LucideIcon;
    iconColor?: string;
    width?: string; // tailwind max-w class
  };

  // Widths based on expected values:
  // bpm: 3 digits (174) -> narrow | W: 3 digits (276) -> narrow
  // pace: 4 chars (5:00) -> narrow | timer: 2-3 chars (10) -> narrow
  // name/email: longer text -> medium | date: fixed -> medium | select: label text -> medium
  const fields: FieldDef[] = [
    { key: "displayName", label: "Navn", type: "text", placeholder: "Dit navn", group: "Personlig info", width: "max-w-[180px]" },
    { key: "email", label: "Email", type: "email", placeholder: "din@email.dk", group: "Personlig info", width: "max-w-[200px]" },
    { key: "dateOfBirth", label: "Foedselsdato", type: "date", group: "Personlig info", width: "max-w-[160px]" },
    { key: "gender", label: "Koen", type: "select", options: GENDER_OPTIONS, group: "Personlig info", width: "max-w-[120px]" },
    { key: "height", label: "Hoejde", type: "number", unit: "cm", group: "Personlig info", width: "max-w-[100px]" },
    { key: "weight", label: "Vaegt", type: "number", unit: "kg", step: "0.1", group: "Personlig info", width: "max-w-[100px]" },
    { key: "maxHr", label: "HRmax", type: "number", unit: "bpm", group: "Puls & Baselines", icon: Heart, iconColor: "text-red-500", width: "max-w-[100px]" },
    { key: "lthr", label: "LTHR", type: "number", unit: "bpm", group: "Puls & Baselines", icon: Heart, iconColor: "text-orange-500", width: "max-w-[100px]" },
    { key: "restingHr", label: "Hvilepuls", type: "number", unit: "bpm", group: "Puls & Baselines", icon: Heart, iconColor: "text-blue-400", width: "max-w-[100px]" },
    { key: "ftp", label: "FTP", type: "number", unit: "W", group: "Sport-baselines", icon: Zap, iconColor: "text-yellow-500", width: "max-w-[100px]" },
    { key: "swimCss", label: "Svoem CSS", type: "pace", unit: "min/100m", placeholder: "1:45", group: "Sport-baselines", icon: Waves, iconColor: "text-cyan-400", width: "max-w-[100px]" },
    { key: "runThresholdPace", label: "Loeb-taerskel", type: "pace", unit: "min/km", placeholder: "5:00", group: "Sport-baselines", icon: Footprints, iconColor: "text-green-400", width: "max-w-[100px]" },
    { key: "trainingPhilosophy", label: "Filosofi", type: "select", options: PHILOSOPHY_OPTIONS, group: "Traening", icon: Brain, iconColor: "text-purple-400", width: "max-w-[180px]" },
    { key: "cycleType" as any, label: "Cyklus", type: "select", options: CYCLE_OPTIONS, group: "Traening", icon: RefreshCw, iconColor: "text-blue-400", width: "max-w-[200px]" },
    { key: "weeklyVolumeMin", label: "Vol. min", type: "number", unit: "timer", step: "0.5", group: "Traening", icon: Clock, iconColor: "text-muted-foreground", width: "max-w-[90px]" },
    { key: "weeklyVolumeMax", label: "Vol. max", type: "number", unit: "timer", step: "0.5", group: "Traening", icon: Clock, iconColor: "text-muted-foreground", width: "max-w-[90px]" },
  ];

  const isBaselineGroup = (g: string) => g !== "Personlig info";

  const renderFieldGroup = (group: string) => (
    <div className="grid gap-x-4 gap-y-3 grid-cols-2 sm:grid-cols-3">
      {fields.filter((f) => f.group === group).map((f) => {
        const Icon = f.icon;
        return (
        <div key={f.key}>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {Icon && <Icon size={12} className={f.iconColor ?? "text-muted-foreground"} />}
            {f.label}
            {f.unit && <span className="text-muted-foreground/60">({f.unit})</span>}
          </label>
          {f.type === "select" ? (
            <select
              value={form[f.key] != null ? String(form[f.key]) : ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {f.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : f.type === "pace" ? (
            <input
              type="text"
              value={f.key === "runThresholdPace" ? paceRun : paceCss}
              onChange={(e) => handlePaceChange(f.key as any, e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <input
              type={f.type}
              value={form[f.key] != null ? String(form[f.key]) : ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              step={f.step}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
        </div>
        );
      })}
    </div>
  );

  return (
    <form data-testid="athlete-profile-form" onSubmit={handleSubmit} className="space-y-4">

      {/* Profile image + personal info card — image left, 3x2 grid right */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Personlig info</h3>
        <div className="flex gap-12">
          {/* Avatar */}
          <div className="shrink-0 space-y-2">
            <div className="relative h-[100px] w-[100px]">
              <div className="h-full w-full rounded-full overflow-hidden bg-muted flex items-center justify-center ring-2 ring-border">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{initials}</span>
                )}
              </div>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
                <Pencil size={12} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
            {uploading && <span className="text-[10px] text-muted-foreground">Uploader...</span>}
            {imageUrl && (
              <button type="button" onClick={handleImageRemove} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400">
                <X size={10} /> Fjern
              </button>
            )}
          </div>
          {/* Fields in 3 columns, 2 rows */}
          <div className="flex-1">
            {renderFieldGroup("Personlig info")}
          </div>
        </div>
      </div>

      {/* Baselines & Traening card */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Baselines & Traening</h3>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Puls & Baselines</h4>
          {renderFieldGroup("Puls & Baselines")}
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sport-baselines</h4>
          {renderFieldGroup("Sport-baselines")}
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Traening</h4>
          {renderFieldGroup("Traening")}
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={!dirty || isSaving} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
          {isSaving ? "Gemmer..." : "Gem aendringer"}
        </button>
        {dirty && <span className="text-xs text-muted-foreground">Ugemte aendringer</span>}
      </div>
    </form>
  );
}
