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
      });
      setDirty(false);
    }
  }, [profile]);

  function handleChange(field: keyof ProfileUpdatePayload, value: string) {
    setDirty(true);
    const numericFields = ["maxHr", "ftp", "lthr", "swimCss", "restingHr", "weight"];
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

  const fields: {
    key: keyof ProfileUpdatePayload;
    label: string;
    type: string;
    unit?: string;
    placeholder?: string;
  }[] = [
    { key: "displayName", label: "Navn", type: "text", placeholder: "Dit navn" },
    { key: "email", label: "Email", type: "email", placeholder: "din@email.dk" },
    { key: "maxHr", label: "Maks puls (HRmax)", type: "number", unit: "bpm" },
    { key: "lthr", label: "Laktattaerskel puls (LTHR)", type: "number", unit: "bpm" },
    { key: "restingHr", label: "Hvilepuls", type: "number", unit: "bpm" },
    { key: "ftp", label: "FTP (Functional Threshold Power)", type: "number", unit: "W" },
    { key: "swimCss", label: "Svoem CSS (Critical Swim Speed)", type: "number", unit: "s/100m" },
    { key: "weight", label: "Vaegt", type: "number", unit: "kg" },
  ];

  return (
    <form
      data-testid="athlete-profile-form"
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-4"
    >
      <h3 className="mb-4 text-sm font-semibold text-foreground">Atletprofil & Baselines</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {f.label}
              {f.unit && (
                <span className="ml-1 text-muted-foreground/60">({f.unit})</span>
              )}
            </label>
            <input
              type={f.type}
              value={
                form[f.key] !== null && form[f.key] !== undefined
                  ? String(form[f.key])
                  : ""
              }
              onChange={(e) => handleChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              step={f.key === "weight" ? "0.1" : undefined}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        ))}
      </div>

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
