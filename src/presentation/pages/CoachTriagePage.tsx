import CoachTriageDashboard from "@/presentation/components/ai-coaching/CoachTriageDashboard";

export default function CoachTriagePage() {
  return (
    <div data-testid="coach-triage-page" className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Coach Triage</h1>
        <p className="text-sm text-muted-foreground">Overblik over alle atleter — prioriteret efter behov for opmaerksomhed</p>
      </div>
      <CoachTriageDashboard />
    </div>
  );
}
