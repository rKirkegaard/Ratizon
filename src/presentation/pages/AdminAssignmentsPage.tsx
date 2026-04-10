import { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/application/api/client";
import { Link2, Plus, Trash2, Search } from "lucide-react";

interface Assignment {
  id: string;
  coachId: string;
  athleteId: string;
  coachName: string;
  coachEmail: string;
  athleteName: string;
  assignedAt: string;
}
interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

type Tab = "tildelinger" | "coaches" | "atleter";

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [coachId, setCoachId] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("tildelinger");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const [aData, uData]: any[] = await Promise.all([
        apiClient.get("/admin/assignments"),
        apiClient.get("/admin/users"),
      ]);
      setAssignments(Array.isArray(aData) ? aData : aData?.data ?? []);
      setUsers(Array.isArray(uData) ? uData : uData?.data ?? []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const coaches = users.filter((u) => u.role === "coach" || u.role === "admin");
  const athleteUsers = users.filter((u) => u.role === "athlete");

  const handleCreate = async () => {
    if (!coachId || !athleteId) return;
    await apiClient
      .post("/admin/assignments", { coachUserId: coachId, athleteId })
      .catch(() => {});
    setShowCreate(false);
    setCoachId("");
    setAthleteId("");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker paa at du vil fjerne denne tildeling?")) return;
    await apiClient.delete(`/admin/assignments/${id}`);
    fetchData();
  };

  // Stats
  const coachCount = new Set(assignments.map((a) => a.coachId)).size;
  const athleteCount = athleteUsers.length;
  const assignedAthleteIds = new Set(assignments.map((a) => a.athleteId));
  const unassignedCount = athleteUsers.filter(
    (u) => !assignedAthleteIds.has(u.id)
  ).length;

  // Search helper
  const q = search.toLowerCase().trim();

  // Tab 1: Tildelinger — filtered
  const filteredAssignments = useMemo(
    () =>
      q
        ? assignments.filter(
            (a) =>
              a.coachName.toLowerCase().includes(q) ||
              a.athleteName.toLowerCase().includes(q)
          )
        : assignments,
    [assignments, q]
  );

  // Tab 2: Coaches — grouped
  const coachRows = useMemo(() => {
    const map = new Map<
      string,
      {
        coachId: string;
        name: string;
        email: string;
        athletes: string[];
      }
    >();
    for (const a of assignments) {
      let entry = map.get(a.coachId);
      if (!entry) {
        entry = {
          coachId: a.coachId,
          name: a.coachName,
          email: a.coachEmail,
          athletes: [],
        };
        map.set(a.coachId, entry);
      }
      entry.athletes.push(a.athleteName);
    }
    const rows = Array.from(map.values());
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [assignments, q]);

  // Tab 3: Atleter — all athlete users with assignment info
  const athleteRows = useMemo(() => {
    const assignmentByAthlete = new Map<
      string,
      { coachName: string; assignedAt: string }
    >();
    for (const a of assignments) {
      assignmentByAthlete.set(a.athleteId, {
        coachName: a.coachName,
        assignedAt: a.assignedAt,
      });
    }
    const rows = athleteUsers.map((u) => {
      const info = assignmentByAthlete.get(u.id);
      return {
        id: u.id,
        name: u.displayName,
        email: u.email,
        coachName: info?.coachName ?? null,
        assignedAt: info?.assignedAt ?? null,
      };
    });
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.coachName && r.coachName.toLowerCase().includes(q))
    );
  }, [athleteUsers, assignments, q]);

  const tabClass = (t: Tab) =>
    t === activeTab
      ? "border-b-2 border-primary text-foreground px-4 py-2 text-sm font-medium"
      : "text-muted-foreground hover:text-foreground px-4 py-2 text-sm font-medium";

  const handleTabChange = (t: Tab) => {
    setActiveTab(t);
    setSearch("");
  };

  return (
    <div
      data-testid="admin-assignments-page"
      className="space-y-6 p-4 md:p-6"
    >
      {/* Header */}
      <div
        data-testid="assignments-header"
        className="flex items-center gap-3"
      >
        <Link2 className="h-6 w-6 text-green-400" />
        <h1 className="text-2xl font-bold text-foreground">
          Coach-Atlet Tildelinger
        </h1>
      </div>

      {/* Stats */}
      <div
        data-testid="assignments-stats"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <div
          data-testid="stat-tildelinger"
          className="rounded-lg border border-border bg-card p-3 text-center"
        >
          <div className="text-2xl font-bold text-foreground">
            {assignments.length}
          </div>
          <div className="text-xs text-muted-foreground">Tildelinger</div>
        </div>
        <div
          data-testid="stat-coaches"
          className="rounded-lg border border-border bg-card p-3 text-center"
        >
          <div className="text-2xl font-bold text-foreground">{coachCount}</div>
          <div className="text-xs text-muted-foreground">Coaches</div>
        </div>
        <div
          data-testid="stat-atleter"
          className="rounded-lg border border-border bg-card p-3 text-center"
        >
          <div className="text-2xl font-bold text-foreground">
            {athleteCount}
          </div>
          <div className="text-xs text-muted-foreground">Atleter</div>
        </div>
        <div
          data-testid="stat-ufordelte"
          className="rounded-lg border border-border bg-card p-3 text-center"
        >
          <div className="text-2xl font-bold text-foreground">
            {unassignedCount}
          </div>
          <div className="text-xs text-muted-foreground">Ufordelte</div>
        </div>
      </div>

      {/* Tabs */}
      <div
        data-testid="assignments-tabs"
        className="flex gap-0 border-b border-border"
      >
        <button
          data-testid="tab-tildelinger"
          onClick={() => handleTabChange("tildelinger")}
          className={tabClass("tildelinger")}
        >
          Tildelinger
        </button>
        <button
          data-testid="tab-coaches"
          onClick={() => handleTabChange("coaches")}
          className={tabClass("coaches")}
        >
          Coaches
        </button>
        <button
          data-testid="tab-atleter"
          onClick={() => handleTabChange("atleter")}
          className={tabClass("atleter")}
        >
          Atleter
        </button>
      </div>

      {/* Toolbar: search + create button */}
      <div
        data-testid="assignments-toolbar"
        className="flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            data-testid="assignments-search"
            type="text"
            placeholder="Soeg..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        {activeTab === "tildelinger" && (
          <button
            data-testid="btn-ny-tildeling"
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Ny Tildeling
          </button>
        )}
      </div>

      {/* Inline create form */}
      {showCreate && activeTab === "tildelinger" && (
        <div
          data-testid="create-assignment-form"
          className="space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <h3 className="text-sm font-semibold text-foreground">
            Ny Tildeling
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Coach
              </label>
              <select
                data-testid="select-coach"
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Vaelg coach...</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Atlet
              </label>
              <select
                data-testid="select-athlete"
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Vaelg atlet...</option>
                {athleteUsers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              data-testid="btn-opret"
              onClick={handleCreate}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Opret
            </button>
            <button
              data-testid="btn-annuller"
              onClick={() => setShowCreate(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Tab content */}
      {loading ? (
        <div data-testid="loading-skeleton" className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* Tab 1: Tildelinger */}
          {activeTab === "tildelinger" &&
            (filteredAssignments.length === 0 ? (
              <div
                data-testid="empty-tildelinger"
                className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border"
              >
                <p className="text-sm text-muted-foreground">
                  {q ? "Ingen tildelinger matcher din soegning." : "Ingen tildelinger endnu."}
                </p>
              </div>
            ) : (
              <div
                data-testid="table-tildelinger"
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="p-3">Coach</th>
                      <th className="p-3">Atlet</th>
                      <th className="p-3">Tildelt</th>
                      <th className="p-3 text-right">Handlinger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((a) => (
                      <tr
                        key={a.id}
                        data-testid={`assignment-row-${a.id}`}
                        className="border-b border-border/30"
                      >
                        <td className="p-3">
                          <div className="font-medium text-foreground">
                            {a.coachName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {a.coachEmail}
                          </div>
                        </td>
                        <td className="p-3 text-foreground">{a.athleteName}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(a.assignedAt).toLocaleDateString("da-DK")}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            data-testid={`btn-delete-${a.id}`}
                            onClick={() => handleDelete(a.id)}
                            className="rounded p-1 text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {/* Tab 2: Coaches */}
          {activeTab === "coaches" &&
            (coachRows.length === 0 ? (
              <div
                data-testid="empty-coaches"
                className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border"
              >
                <p className="text-sm text-muted-foreground">
                  {q ? "Ingen coaches matcher din soegning." : "Ingen coaches med tildelinger endnu."}
                </p>
              </div>
            ) : (
              <div
                data-testid="table-coaches"
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="p-3">Navn</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Antal Atleter</th>
                      <th className="p-3">Atleter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coachRows.map((c) => (
                      <tr
                        key={c.coachId}
                        data-testid={`coach-row-${c.coachId}`}
                        className="border-b border-border/30"
                      >
                        <td className="p-3 font-medium text-foreground">
                          {c.name}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {c.email}
                        </td>
                        <td className="p-3 text-foreground">
                          {c.athletes.length}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {c.athletes.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {/* Tab 3: Atleter */}
          {activeTab === "atleter" &&
            (athleteRows.length === 0 ? (
              <div
                data-testid="empty-atleter"
                className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border"
              >
                <p className="text-sm text-muted-foreground">
                  {q ? "Ingen atleter matcher din soegning." : "Ingen atleter fundet."}
                </p>
              </div>
            ) : (
              <div
                data-testid="table-atleter"
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="p-3">Navn</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Coach</th>
                      <th className="p-3">Tildelt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {athleteRows.map((r) => (
                      <tr
                        key={r.id}
                        data-testid={`athlete-row-${r.id}`}
                        className="border-b border-border/30"
                      >
                        <td className="p-3 font-medium text-foreground">
                          {r.name}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {r.email}
                        </td>
                        <td className="p-3">
                          {r.coachName ? (
                            <span className="text-foreground">
                              {r.coachName}
                            </span>
                          ) : (
                            <span
                              data-testid={`badge-ingen-coach-${r.id}`}
                              className="inline-block rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400"
                            >
                              Ingen coach
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {r.assignedAt
                            ? new Date(r.assignedAt).toLocaleDateString("da-DK")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
