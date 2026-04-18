import { useState } from "react";
import { StickyNote, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useCoachNotes,
  useCreateCoachNote,
  useUpdateCoachNote,
  useDeleteCoachNote,
} from "@/application/hooks/ai-coaching/useAICoaching";
import ConfirmDialog from "@/presentation/components/shared/ConfirmDialog";

interface CoachNotesSectionProps {
  sessionId: number;
}

interface CoachNote {
  id: string;
  content: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CoachNotesSection({ sessionId }: CoachNotesSectionProps) {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: rawNotes, isLoading } = useCoachNotes(athleteId, sessionId);
  const createMutation = useCreateCoachNote(athleteId);
  const updateMutation = useUpdateCoachNote(athleteId);
  const deleteMutation = useDeleteCoachNote(athleteId);

  const notes = (Array.isArray(rawNotes) ? rawNotes : (rawNotes as any)?.data ?? []) as CoachNote[];

  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newVisibility, setNewVisibility] = useState("private");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function handleCreate() {
    if (!newContent.trim()) return;
    createMutation.mutate(
      { content: newContent.trim(), sessionId, visibility: newVisibility },
      { onSuccess: () => { setNewContent(""); setShowForm(false); } }
    );
  }

  function startEdit(note: CoachNote) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  function saveEdit() {
    if (!editingId || !editContent.trim()) return;
    updateMutation.mutate(
      { noteId: editingId, content: editContent.trim() },
      { onSuccess: () => setEditingId(null) }
    );
  }

  if (isLoading) {
    return (
      <div data-testid="coach-notes-section" className="rounded-lg border border-border/50 bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3" />
      </div>
    );
  }

  return (
    <div data-testid="coach-notes-section" className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-foreground">Coach Noter</span>
          {notes.length > 0 && (
            <span className="text-xs text-muted-foreground">({notes.length})</span>
          )}
        </div>
        <button
          data-testid="add-coach-note"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          <Plus className="h-3 w-3" />
          Tilfoej note
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-3">
          <textarea
            data-testid="coach-note-input"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Skriv en note..."
            rows={3}
            className="w-full resize-none rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setNewVisibility(newVisibility === "private" ? "shared" : "private")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {newVisibility === "private" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {newVisibility === "private" ? "Privat" : "Delt med atlet"}
            </button>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Annuller</button>
              <button
                data-testid="save-coach-note"
                onClick={handleCreate}
                disabled={!newContent.trim() || createMutation.isPending}
                className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Gem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">Ingen noter for denne session.</p>
      )}

      {notes.map((note) => (
        <div key={note.id} data-testid={`coach-note-${note.id}`} className="group rounded-md border border-border/30 bg-muted/10 p-3 space-y-1">
          {editingId === note.id ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full resize-none rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">Annuller</button>
                <button onClick={saveEdit} className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Gem</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{formatDate(note.createdAt)}</span>
                  <span className={`rounded px-1 py-0.5 ${note.visibility === "shared" ? "bg-blue-500/20 text-blue-400" : "bg-muted text-muted-foreground"}`}>
                    {note.visibility === "shared" ? "Delt" : "Privat"}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(note)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button onClick={() => setDeleteTarget(note.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget); setDeleteTarget(null); } }}
        title="Slet note"
        message="Er du sikker paa at du vil slette denne note?"
      />
    </div>
  );
}
