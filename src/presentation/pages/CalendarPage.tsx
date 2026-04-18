import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format,
} from "date-fns";
import { ArrowLeftRight, Upload, Download, CheckSquare, Trash2, Brain } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useCalendarSessions, useMoveSession, useDeleteSession,
} from "@/application/hooks/planning/useCalendar";
import { apiClient } from "@/application/api/client";
import WeekView from "@/presentation/components/calendar/WeekView";
import MonthView from "@/presentation/components/calendar/MonthView";
import YearView from "@/presentation/components/calendar/YearView";
import CreateSessionDialog from "@/presentation/components/layout/CreateSessionDialog";
import ImportPlanModal from "@/presentation/components/calendar/ImportPlanModal";
import AITrainingPlanImport from "@/presentation/components/calendar/AITrainingPlanImport";

type ViewMode = "week" | "month" | "year";

function getDateRange(date: Date, mode: ViewMode): { start: string; end: string } {
  switch (mode) {
    case "week": {
      const s = startOfWeek(date, { weekStartsOn: 1 });
      const e = endOfWeek(date, { weekStartsOn: 1 });
      return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
    }
    case "month": {
      const ms = startOfMonth(date);
      const me = endOfMonth(date);
      const s = startOfWeek(ms, { weekStartsOn: 1 });
      const e = endOfWeek(me, { weekStartsOn: 1 });
      return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
    }
    case "year": {
      const s = startOfYear(date);
      const e = endOfYear(date);
      return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
    }
  }
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [, setCreateDate] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [aiImportOpen, setAiImportOpen] = useState(false);

  const selectedAthleteId = useAthleteStore((s) => s.selectedAthleteId);
  const getActiveSports = useAthleteStore((s) => s.getActiveSports);
  const activeSports = getActiveSports();

  const { start, end } = useMemo(() => getDateRange(currentDate, viewMode), [currentDate, viewMode]);
  const { all, phases, goals, pmcPoints, isLoading, isError, error } = useCalendarSessions(selectedAthleteId, start, end);

  const moveMutation = useMoveSession(selectedAthleteId);
  const deleteMutation = useDeleteSession(selectedAthleteId);

  const handleDeletePlanned = useCallback(async (id: string) => {
    if (!window.confirm("Slet denne planlagte session?")) return;
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const handleMovePlanned = useCallback((id: string, newDate: string) => {
    moveMutation.mutate({ sessionId: id, newDate });
  }, [moveMutation]);

  const handleMonthClick = useCallback((date: Date) => { setCurrentDate(date); setViewMode("month"); }, []);
  const handleDayClick = useCallback((date: Date) => { setCurrentDate(date); setViewMode("week"); }, []);
  const handleToday = useCallback(() => setCurrentDate(new Date()), []);

  // "+" button: open create dialog with date
  const handleAddSession = useCallback((dateStr: string) => {
    setCreateDate(dateStr);
    setCreateOpen(true);
  }, []);

  // Multi-select
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Slet ${selectedIds.size} valgte sessioner?`)) return;
    for (const id of selectedIds) {
      await deleteMutation.mutateAsync(id).catch(() => {});
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, deleteMutation]);

  const handleDeleteAll = useCallback(async () => {
    if (!selectedAthleteId) return;
    if (!window.confirm("Slet ALLE planlagte sessioner? Dette kan ikke fortrydes.")) return;
    await apiClient.delete(`/planning/${selectedAthleteId}/sessions/all`).catch(() => {});
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedAthleteId]);

  // Export

  const handleExport = useCallback(() => {
    const planned = all.filter((e) => e.type === "planned").map((e) => e.data);
    if (planned.length === 0) { alert("Ingen planlagte sessioner at eksportere."); return; }
    const json = JSON.stringify({ sessions: planned }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-plan-${format(currentDate, "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [all, currentDate]);

  const sportButtons = [
    { key: null, label: "Alle" },
    ...activeSports.map((s) => ({ key: s.sport_key, label: s.display_name })),
  ];

  return (
    <div data-testid="calendar-page" className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kalender</h1>
        <p className="text-sm text-muted-foreground">Uge, maaned og aarsoverblik</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Navigation */}
        <button onClick={handleToday} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent">I dag</button>

        {/* View toggle */}
        <div className="inline-flex rounded-md border border-border">
          {(["week", "month", "year"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              data-testid={`view-mode-${mode}`}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                viewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {{ week: "Uge", month: "Maaned", year: "Aar" }[mode]}
            </button>
          ))}
        </div>

        {/* Sammenlign */}
        <button onClick={() => navigate("/sammenligning")} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftRight size={14} /> Sammenlign
        </button>

        {/* Import */}
        <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Upload size={14} /> Importer JSON
        </button>
        <button data-testid="ai-import-plan-btn" onClick={() => setAiImportOpen(true)} className="flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/20">
          <Brain size={14} /> AI Import
        </button>

        {/* Export */}
        <button onClick={handleExport} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Download size={14} /> Eksporter
        </button>

        <div className="flex-1" />

        {/* Sport filter pills */}
        <div className="flex gap-1">
          {sportButtons.map((s) => (
            <button
              key={s.key ?? "all"}
              onClick={() => setSportFilter(s.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sportFilter === s.key ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-select toolbar */}
      {selectionMode && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-2">
          <span className="text-sm text-muted-foreground">{selectedIds.size} valgt</span>
          <button onClick={handleBulkDelete} disabled={selectedIds.size === 0} className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50">
            <Trash2 size={12} /> Slet valgte
          </button>
          <button onClick={handleDeleteAll} className="flex items-center gap-1 rounded-md border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10">
            <Trash2 size={12} /> Slet alle
          </button>
          <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Annuller</button>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          Kunne ikke hente kalenderdata: {(error as Error)?.message ?? "Ukendt fejl"}
        </div>
      )}

      {/* No athlete */}
      {!selectedAthleteId && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Vaelg en atlet for at se kalenderen.
        </div>
      )}

      {/* Selection mode + bulk buttons at bottom */}
      {selectedAthleteId && !selectionMode && (
        <div className="flex justify-end gap-2">
          <button onClick={() => setSelectionMode(true)} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            <CheckSquare size={14} /> Vaelg flere
          </button>
        </div>
      )}

      {/* Views */}
      {selectedAthleteId && viewMode === "week" && (
        <WeekView
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          entries={all}
          sportFilter={sportFilter}
          isLoading={isLoading}
          onDeletePlanned={handleDeletePlanned}
          onMovePlanned={handleMovePlanned}
          onAddSession={handleAddSession}
          phases={phases}
          goals={goals}
          pmcPoints={pmcPoints}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelection}
        />
      )}

      {selectedAthleteId && viewMode === "month" && (
        <MonthView
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          entries={all}
          sportFilter={sportFilter}
          isLoading={isLoading}
          onDayClick={handleDayClick}
          onAddSession={handleAddSession}
          phases={phases}
          goals={goals}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelection}
        />
      )}

      {selectedAthleteId && viewMode === "year" && (
        <YearView
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          entries={all}
          sportFilter={sportFilter}
          isLoading={isLoading}
          onMonthClick={handleMonthClick}
          phases={phases}
          goals={goals}
        />
      )}

      {/* Dialogs */}
      <CreateSessionDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {selectedAthleteId && (
        <ImportPlanModal open={importOpen} onClose={() => setImportOpen(false)} athleteId={selectedAthleteId} />
      )}
      <AITrainingPlanImport open={aiImportOpen} onClose={() => setAiImportOpen(false)} athleteId={selectedAthleteId ?? ""} />
    </div>
  );
}
