import { useState, useCallback, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessions } from "@/application/hooks/training/useSessions";
import { apiClient } from "@/application/api/client";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import {
  Upload, CheckCircle, AlertCircle, Clock, Trash2, List, Grid3X3, ChevronDown, ChevronUp, X,
} from "lucide-react";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}t ${m}m` : `${m}m`;
}
function formatDistance(meters: number | null): string {
  if (!meters) return "–";
  return `${(meters / 1000).toFixed(1)} km`;
}

type UploadResult = { filename: string; success: boolean; error?: string; sport?: string };

export default function UploadPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sessionsData, isLoading: sessionsLoading } = useSessions(athleteId, "all");
  const sessions = sessionsData?.sessions ?? [];

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [deletingAll, setDeletingAll] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [visibleMonths, setVisibleMonths] = useState(2);

  // Group sessions by month
  const groupedSessions = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("da-DK", { month: "long", year: "numeric" });
    const groups = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const label = fmt.format(new Date(s.startedAt));
      const arr = groups.get(label) || [];
      arr.push(s);
      groups.set(label, arr);
    }
    return Array.from(groups.entries());
  }, [sessions]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Batch upload handler
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!athleteId || uploading) return;
    const fileArr = Array.from(files);
    const validExts = new Set(["fit", "tcx", "zip"]);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const f of fileArr) {
      const ext = f.name.toLowerCase().split(".").pop() || "";
      if (validExts.has(ext)) validFiles.push(f);
      else invalidFiles.push(f.name);
    }

    if (validFiles.length === 0) {
      setUploadResults([{ filename: invalidFiles.join(", "), success: false, error: "Forkerte filtyper. Kun .fit, .tcx og .zip er tilladt." }]);
      setShowResults(true);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);
    setShowResults(true);

    const results: UploadResult[] = [];
    let completed = 0;

    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        let token = "";
        try {
          const stored = localStorage.getItem("ratizon-auth");
          if (stored) token = JSON.parse(stored)?.state?.accessToken || "";
        } catch { /* ignore */ }

        const response = await fetch(`/api/training/upload/${athleteId}`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const session = data?.data || data;
        results.push({ filename: file.name, success: true, sport: session?.sport });
      } catch (err: any) {
        results.push({ filename: file.name, success: false, error: err.message });
      }

      completed++;
      setUploadProgress((completed / validFiles.length) * 100);
      setUploadResults([...results]);
    }

    if (invalidFiles.length > 0) {
      results.push({ filename: invalidFiles.join(", "), success: false, error: "Forkerte filtyper" });
      setUploadResults([...results]);
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["sessions", athleteId] });
    queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
  }, [athleteId, uploading, queryClient]);

  const handleDeleteSession = useCallback(async (sessionId: string, title: string) => {
    if (!athleteId || !confirm(`Er du sikker paa, at du vil slette "${title}"?`)) return;
    try {
      await apiClient.delete(`/training/sessions/${athleteId}/${sessionId}`);
      queryClient.invalidateQueries({ queryKey: ["sessions", athleteId] });
    } catch { /* handled */ }
  }, [athleteId, queryClient]);

  const handleDeleteAll = useCallback(async () => {
    if (!athleteId || !confirm(`Dette vil permanent slette alle ${sessions.length} traeninger. Er du sikker?`)) return;
    setDeletingAll(true);
    try {
      for (const s of sessions) {
        await apiClient.delete(`/training/sessions/${athleteId}/${s.id}`).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["sessions", athleteId] });
    } finally {
      setDeletingAll(false);
    }
  }, [athleteId, sessions, queryClient]);

  if (!athleteId) {
    return (
      <div data-testid="upload-page" className="mx-auto max-w-4xl p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Upload</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Vaelg en atlet for at uploade traeningsfiler.</p>
        </div>
      </div>
    );
  }

  const successCount = uploadResults.filter((r) => r.success).length;
  const errorCount = uploadResults.filter((r) => !r.success).length;

  return (
    <div data-testid="upload-page" className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-foreground">Upload</h1>

      {/* Upload zone */}
      <div
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
          dragActive ? "border-primary bg-primary/5" : uploading ? "border-border opacity-60 cursor-wait" : "border-border hover:border-muted-foreground hover:bg-muted/20"
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".fit,.tcx,.zip" multiple onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} className="sr-only" />
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Traek og slip FIT, TCX eller ZIP filer her</p>
        <p className="mt-1 text-xs text-muted-foreground">eller klik for at vaelge filer (flere ad gangen)</p>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Behandler filer...</span>
            <span className="text-foreground">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Upload results */}
      {showResults && uploadResults.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Upload-resultater
              {successCount > 0 && <span className="ml-2 text-green-400">{successCount} OK</span>}
              {errorCount > 0 && <span className="ml-2 text-red-400">{errorCount} fejl</span>}
            </h3>
            <button onClick={() => setShowResults(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="space-y-1.5">
            {uploadResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs ${r.success ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {r.success ? <CheckCircle className="h-4 w-4 text-green-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
                <span className="font-medium text-foreground">{r.filename}</span>
                {r.success && r.sport && <span className="text-muted-foreground">— {r.sport}</span>}
                {!r.success && r.error && <span className="text-red-400">— {r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session history — grouped by month, list/grid toggle, delete all */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Upload-historik ({sessions.length} filer)</h3>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border">
              <button onClick={() => setViewMode("list")} className={`p-1.5 ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}><List size={14} /></button>
              <button onClick={() => setViewMode("grid")} className={`p-1.5 ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`}><Grid3X3 size={14} /></button>
            </div>
            {sessions.length > 0 && (
              <button onClick={handleDeleteAll} disabled={deletingAll} className="flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50">
                <Trash2 size={10} /> Slet alle
              </button>
            )}
          </div>
        </div>

        {sessionsLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Ingen uploads endnu.</div>
        ) : (
          <div className="space-y-3">
            {groupedSessions.slice(0, visibleMonths).map(([monthLabel, monthSessions]) => {
              const collapsed = collapsedGroups.has(monthLabel);
              return (
                <div key={monthLabel}>
                  {/* Sticky month header with backdrop blur */}
                  <button
                    onClick={() => toggleGroup(monthLabel)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground capitalize sticky top-0 z-10 bg-card/80 backdrop-blur-sm border border-border/30"
                  >
                    <span>{monthLabel} ({monthSessions.length})</span>
                    {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>

                  {!collapsed && (viewMode === "list" ? (
                    <div className="mt-1.5 space-y-1.5">
                      {monthSessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: `${getSportColor(s.sport)}20` }}>
                              <SportIcon sport={s.sport} size={16} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{formatDistance(s.distanceMeters)} — {formatDuration(s.durationSeconds)}</div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" /> {formatDate(s.startedAt)}
                                {s.avgHr != null && <span>HR {s.avgHr} bpm</span>}
                                {s.avgPower != null && <span>{s.avgPower}W</span>}
                                {s.tss != null && <span>TSS {Math.round(s.tss)}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleDeleteSession(s.id, s.title)} className="rounded p-1 text-muted-foreground hover:text-red-400"><Trash2 size={14} /></button>
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                      {monthSessions.map((s) => (
                        <div key={s.id} className="rounded-lg border border-border/30 bg-muted/10 p-2.5 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <SportIcon sport={s.sport} size={14} />
                            <CheckCircle className="h-3 w-3 text-green-400" />
                          </div>
                          <div className="font-semibold text-foreground text-sm">{formatDistance(s.distanceMeters)}</div>
                          <div className="text-muted-foreground">{formatDuration(s.durationSeconds)}</div>
                          <div className="flex items-center gap-1 text-muted-foreground mt-1"><Clock className="h-3 w-3" /> {formatDate(s.startedAt)}</div>
                          {s.avgHr != null && <div className="text-muted-foreground">HR {s.avgHr} bpm</div>}
                          {s.avgPower != null && <div className="text-muted-foreground">{s.avgPower}W</div>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Load More button */}
            {visibleMonths < groupedSessions.length && (
              <button
                onClick={() => setVisibleMonths((v) => v + 3)}
                className="w-full rounded-md border border-border py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
              >
                Vis flere ({groupedSessions.length - visibleMonths} maaneder mere)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Export guides */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Garmin Connect</h4>
          <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
            <li>Log ind paa Garmin Connect</li>
            <li>Vaelg aktivitet</li>
            <li>Klik paa tandhjul-ikonet</li>
            <li>Vaelg "Eksporter som TCX" eller "Original FIT"</li>
          </ol>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Wahoo ELEMNT</h4>
          <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
            <li>Aabn ELEMNT app</li>
            <li>Vaelg tur</li>
            <li>Tryk paa del-knappen</li>
            <li>Vaelg "Eksporter TCX"</li>
          </ol>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Strava</h4>
          <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
            <li>Gaa til aktivitet paa Strava</li>
            <li>Klik paa "Actions" menu</li>
            <li>Vaelg "Export TCX"</li>
            <li>Download filen</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
