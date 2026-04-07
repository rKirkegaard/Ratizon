import { useState, useEffect } from "react";
import { apiClient } from "@/application/api/client";
import { Link2, Plus, Trash2 } from "lucide-react";

interface Assignment { id: string; coachId: string; athleteId: string; coachName: string; coachEmail: string; athleteName: string; assignedAt: string }
interface User { id: string; email: string; displayName: string; role: string }

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [coachId, setCoachId] = useState("");
  const [athleteId, setAthleteId] = useState("");

  const fetchData = async () => {
    try {
      const [aData, uData]: any[] = await Promise.all([
        apiClient.get("/admin/assignments"),
        apiClient.get("/admin/users"),
      ]);
      setAssignments(Array.isArray(aData) ? aData : aData?.data ?? []);
      setUsers(Array.isArray(uData) ? uData : uData?.data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const coaches = users.filter((u) => u.role === "coach" || u.role === "admin");
  const athleteUsers = users.filter((u) => u.role === "athlete");

  const handleCreate = async () => {
    if (!coachId || !athleteId) return;
    await apiClient.post("/admin/assignments", { coachUserId: coachId, athleteId }).catch(() => {});
    setShowCreate(false);
    setCoachId("");
    setAthleteId("");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker paa at du vil fjerne denne tilknytning?")) return;
    await apiClient.delete(`/admin/assignments/${id}`);
    fetchData();
  };

  const coachCount = new Set(assignments.map((a) => a.coachId)).size;
  const athleteCount = new Set(assignments.map((a) => a.athleteId)).size;

  return (
    <div data-testid="admin-assignments-page" className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="h-6 w-6 text-green-400" />
          <h1 className="text-2xl font-bold text-foreground">Coach-Atlet Tilknytninger</h1>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Ny tilknytning
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{coachCount}</div>
          <div className="text-xs text-muted-foreground">Coaches</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{athleteCount}</div>
          <div className="text-xs text-muted-foreground">Atleter</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{assignments.length}</div>
          <div className="text-xs text-muted-foreground">Aktive tilknytninger</div>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Ny tilknytning</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Coach</label>
              <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Vaelg coach...</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.displayName} ({c.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Atlet</label>
              <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Vaelg atlet...</option>
                {athleteUsers.map((a) => <option key={a.id} value={a.id}>{a.displayName}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Opret</button>
            <button onClick={() => setShowCreate(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground">Annuller</button>
          </div>
        </div>
      )}

      {/* Assignments table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
      ) : assignments.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Ingen tilknytninger endnu.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="p-3">Coach</th>
                <th className="p-3">Atlet</th>
                <th className="p-3">Dato</th>
                <th className="p-3 text-right">Handling</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-b border-border/30">
                  <td className="p-3">
                    <div className="font-medium text-foreground">{a.coachName}</div>
                    <div className="text-xs text-muted-foreground">{a.coachEmail}</div>
                  </td>
                  <td className="p-3 text-foreground">{a.athleteName}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(a.assignedAt).toLocaleDateString("da-DK")}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(a.id)} className="rounded p-1 text-muted-foreground hover:text-red-400"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
