import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useTests, useCreateTest, useDeleteTest, useApplyBaseline } from "@/application/hooks/analytics/useTests";
import { Plus, Trash2, CheckCircle2, FlaskConical, Loader2 } from "lucide-react";

const TEST_TYPES = [
  { value: "ftp", label: "FTP Test", sport: "bike", unit: "W", baselineField: "ftp" },
  { value: "css", label: "CSS Test", sport: "swim", unit: "s/100m", baselineField: "swimCss" },
  { value: "run_threshold", label: "Loebetaerskel", sport: "run", unit: "s/km", baselineField: "runThresholdPace" },
  { value: "lactate", label: "Laktattest", sport: "bike", unit: "mmol/L", baselineField: "lthr" },
  { value: "vo2max", label: "VO2max Test", sport: "run", unit: "ml/kg/min", baselineField: null },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

export default function TestBaselinesPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: tests, isLoading } = useTests(athleteId);
  const createTest = useCreateTest(athleteId);
  const deleteTest = useDeleteTest(athleteId);
  const applyBaseline = useApplyBaseline(athleteId);

  const [showForm, setShowForm] = useState(false);
  const [testType, setTestType] = useState("ftp");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [resultValue, setResultValue] = useState("");
  const [protocol, setProtocol] = useState("");
  const [notes, setNotes] = useState("");

  if (!athleteId) {
    return (
      <div data-testid="test-baselines-page" className="p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Test & Baselines</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Vaelg en atlet.</p>
        </div>
      </div>
    );
  }

  const selectedType = TEST_TYPES.find((t) => t.value === testType) ?? TEST_TYPES[0];

  const handleCreate = () => {
    createTest.mutate({
      testType,
      testDate,
      sport: selectedType.sport,
      protocol: protocol || null,
      resultValue: resultValue ? parseFloat(resultValue) : null,
      resultUnit: selectedType.unit,
      baselineField: selectedType.baselineField,
      baselineValue: resultValue ? parseFloat(resultValue) : null,
      notes: notes || null,
    } as any, {
      onSuccess: () => {
        setShowForm(false);
        setResultValue("");
        setProtocol("");
        setNotes("");
      },
    });
  };

  return (
    <div data-testid="test-baselines-page" className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-foreground">Test & Baselines</h1>
        </div>
        <button
          data-testid="add-test"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Registrer test
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div data-testid="test-form" className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Ny test</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Test-type</label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                {TEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Dato</label>
              <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Resultat ({selectedType.unit})</label>
              <input type="number" value={resultValue} onChange={(e) => setResultValue(e.target.value)} placeholder={selectedType.unit} className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Protokol</label>
              <input value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="f.eks. 20min FTP" className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Noter</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createTest.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {createTest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem test"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground">Annuller</button>
          </div>
        </div>
      )}

      {/* Test list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : !tests || tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <FlaskConical className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Ingen tests registreret endnu.</p>
          <p className="text-xs text-muted-foreground mt-1">Registrer din foerste FTP, CSS eller laktattest.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((test) => {
            const typeDef = TEST_TYPES.find((t) => t.value === test.testType);
            return (
              <div
                key={test.id}
                data-testid={`test-row-${test.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    test.sport === "bike" ? "bg-green-500/10" : test.sport === "run" ? "bg-orange-500/10" : "bg-blue-500/10"
                  }`}>
                    <FlaskConical className={`h-5 w-5 ${
                      test.sport === "bike" ? "text-green-400" : test.sport === "run" ? "text-orange-400" : "text-blue-400"
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {typeDef?.label ?? test.testType}
                      {test.protocol && <span className="ml-2 text-muted-foreground">({test.protocol})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(test.testDate)}
                      {test.resultValue != null && (
                        <span className="ml-2 font-semibold text-foreground">
                          {test.resultValue} {test.resultUnit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {test.baselineField && test.baselineValue && !test.baselineApplied && (
                    <button
                      data-testid={`apply-baseline-${test.id}`}
                      onClick={() => applyBaseline.mutate(test.id)}
                      disabled={applyBaseline.isPending}
                      className="flex items-center gap-1 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Anvend baseline
                    </button>
                  )}
                  {test.baselineApplied && (
                    <span className="text-xs text-green-400">Baseline anvendt</span>
                  )}
                  <button
                    onClick={() => deleteTest.mutate(test.id)}
                    className="text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
