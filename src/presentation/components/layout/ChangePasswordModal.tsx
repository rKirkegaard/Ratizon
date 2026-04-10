import { useState, useMemo } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { apiClient, ApiError } from "@/application/api/client";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requirements = useMemo(() => [
    { label: "Mindst 8 tegn", met: newPassword.length >= 8 },
    { label: "Mindst \u00e9t tal", met: /\d/.test(newPassword) },
    { label: "Mindst \u00e9t stort bogstav", met: /[A-Z]/.test(newPassword) },
    { label: "Mindst \u00e9t specialtegn", met: /[^A-Za-z0-9]/.test(newPassword) },
  ], [newPassword]);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const allRequirementsMet = requirements.every((r) => r.met);
  const isValid = currentPassword.length > 0 && passwordsMatch && allRequirementsMet;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.put("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string } | null;
        setError(data?.message ?? "Der opstod en fejl. Proev igen.");
      } else {
        setError("Der opstod en fejl. Proev igen.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      data-testid="change-password-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={handleClose}
    >
      <div
        data-testid="change-password-modal"
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">Skift password</h2>

        {error && (
          <div data-testid="change-password-error" className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Current password */}
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Nuvaerende password</label>
            <div className="relative">
              <input
                data-testid="current-password-input"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground"
                autoComplete="current-password"
              />
              <button
                data-testid="toggle-current-password"
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Nyt password</label>
            <div className="relative">
              <input
                data-testid="new-password-input"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground"
                autoComplete="new-password"
              />
              <button
                data-testid="toggle-new-password"
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Bekraeft nyt password</label>
            <div className="relative">
              <input
                data-testid="confirm-password-input"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground"
                autoComplete="new-password"
              />
              <button
                data-testid="toggle-confirm-password"
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Requirements checklist */}
          <div data-testid="password-requirements" className="space-y-1">
            {requirements.map((req) => (
              <div key={req.label} className="flex items-center gap-2 text-xs">
                {req.met ? (
                  <Check size={14} className="text-green-400" />
                ) : (
                  <X size={14} className="text-red-400" />
                )}
                <span className={req.met ? "text-green-400" : "text-red-400"}>{req.label}</span>
              </div>
            ))}
            {confirmPassword.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                {passwordsMatch ? (
                  <Check size={14} className="text-green-400" />
                ) : (
                  <X size={14} className="text-red-400" />
                )}
                <span className={passwordsMatch ? "text-green-400" : "text-red-400"}>Passwords matcher</span>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            data-testid="cancel-change-password"
            type="button"
            onClick={handleClose}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            Annuller
          </button>
          <button
            data-testid="submit-change-password"
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Gemmer..." : "Gem password"}
          </button>
        </div>
      </div>
    </div>
  );
}
