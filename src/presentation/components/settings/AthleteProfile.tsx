import { useState, useEffect } from "react";
import type {
  AthleteProfileData,
  ProfileUpdatePayload,
} from "@/application/hooks/athlete/useAthleteProfile";

interface AthleteProfileProps {
  profile: AthleteProfileData | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (payload: ProfileUpdatePayload) => void;
}

export default function AthleteProfile({
  profile,
  isLoading,
  isSaving,
  onSave,
}: AthleteProfileProps) {
  const [form, setForm] = useState<ProfileUpdatePayload>({});
  const [dirty, setDirty] = useState(false);

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
      });
      setDirty(false);
    }
  }, [profile]);

  function handleChange(field: keyof ProfileUpdatePayload, value: string) {
    setDirty(true);
    const numericFields = ["maxHr", "ftp", "lthr", "swimCss", "restingHr", "weight", "runThresholdPace", "height", "weeklyVolumeMin", "weeklyVolumeMax"];
    if (numericFields.includes(field)) {
      setForm((prev) => ({
        ...prev,
        [field]: value === "" ? null : Number(value),
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    setDirty(false);
  }

  if (isLoading) {
    return (
      <div
        data-testid="athlete-profile-form"
        className="space-y-4"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg border border-border/50 bg-muted"
          />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        data-testid="athlete-profile-form"
        className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Kunne ikke hente atletprofil.
        </p>
      </div>
    );
  }

  const PHILOSOPHY_OPTIONS = [
    { value: "", label: "Vaelg filosofi..." },
    { value: "polarized", label: "Polariseret (80/20)" },
    { value: "pyramidal", label: "Pyramidal" },
    { value: "sweet_spot", label: "Sweet Spot" },
    { value: "norwegian", label: "Norsk metode (dobbelt-tærskel)" },
    { value: "hybrid", label: "Hybrid" },
  ];

  const GENDER_OPTIONS = [
    { value: "", label: "Vaelg..." },
    { value: "male", label: "Mand" },
    { value: "female", label: "Kvinde" },
    { value: "other", label: "Andet" },
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
  };

  const fields: FieldDef[] = [
    // Personlig info
    { key: "displayName", label: "Navn", type: "text", placeholder: "Dit navn", group: "Personlig info" },
    { key: "email", label: "Email", type: "email", placeholder: "din@email.dk", group: "Personlig info" },
    { key: "dateOfBirth", label: "Foedselsdato", type: "date", group: "Personlig info" },
    { key: "gender", label: "Koen", type: "select", options: GENDER_OPTIONS, group: "Personlig info" },
    { key: "height", label: "Hoejde", type: "number", unit: "cm", group: "Personlig info" },
    { key: "weight", label: "Vaegt", type: "number", unit: "kg", step: "0.1", group: "Personlig info" },
    // Puls-baselines
    { key: "maxHr", label: "Maks puls (HRmax)", type: "number", unit: "bpm", group: "Puls & Baselines" },
    { key: "lthr", label: "Laktattaerskel puls (LTHR)", type: "number", unit: "bpm", group: "Puls & Baselines" },
    { key: "restingHr", label: "Hvilepuls", type: "number", unit: "bpm", group: "Puls & Baselines" },
    // Sport-baselines
    { key: "ftp", label: "FTP (Functional Threshold Power)", type: "number", unit: "W", group: "Sport-baselines" },
    { key: "swimCss", label: "Svoem CSS (Critical Swim Speed)", type: "number", unit: "s/100m", group: "Sport-baselines" },
    { key: "runThresholdPace", label: "Loeb-taerskeltempo", type: "number", unit: "s/km", step: "1", placeholder: "f.eks. 300 (5:00/km)", group: "Sport-baselines" },
    // Traening
    { key: "trainingPhilosophy", label: "Traeningsfilosofi", type: "select", options: PHILOSOPHY_OPTIONS, group: "Traening" },
    { key: "weeklyVolumeMin", label: "Ugentlig volumen (min)", type: "number", unit: "timer", step: "0.5", group: "Traening" },
    { key: "weeklyVolumeMax", label: "Ugentlig volumen (max)", type: "number", unit: "timer", step: "0.5", group: "Traening" },
  ];

  return (
    <form
      data-testid="athlete-profile-form"
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-4"
    >
      <h3 className="mb-4 text-sm font-semibold text-foreground">Atletprofil & Baselines</h3>

      {(() => {
        const groups = [...new Set(fields.map((f) => f.group))];
        return groups.map((group) => (
          <div key={group} className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {fields
                .filter((f) => f.group === group)
                .map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {f.label}
                      {f.unit && (
                        <span className="ml-1 text-muted-foreground/60">({f.unit})</span>
                      )}
                    </label>
                    {f.type === "select" ? (
                      <select
                        value={form[f.key] != null ? String(form[f.key]) : ""}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {f.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
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
                ))}
            </div>
          </div>
        ));
      })()}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || isSaving}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Gemmer..." : "Gem aendringer"}
        </button>
        {dirty && (
          <span className="text-xs text-muted-foreground">
            Ugemte aendringer
          </span>
        )}
      </div>
    </form>
  );
}
