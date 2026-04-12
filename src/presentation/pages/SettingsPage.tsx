import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div data-testid="settings-page" className="p-4 md:p-6">
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="text-sm text-muted-foreground mb-3">
          Indstillinger er flyttet til System Indstillinger.
        </p>
        <button
          onClick={() => navigate("/admin/indstillinger")}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Gaa til System Indstillinger
        </button>
      </div>
    </div>
  );
}
