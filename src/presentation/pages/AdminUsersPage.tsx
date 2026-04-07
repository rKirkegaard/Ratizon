import { useState, useEffect } from "react";
import { apiClient } from "@/application/api/client";
import { Users, Plus, Trash2, Key, Edit2, Shield, UserCircle } from "lucide-react";

interface User { id: string; email: string; displayName: string; role: string; createdAt: string }

const ROLE_BADGES: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  coach: "bg-green-500/20 text-green-400 border-green-500/30",
  athlete: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "athlete" });
  const [editForm, setEditForm] = useState({ displayName: "", role: "" });
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const data: any = await apiClient.get("/admin/users");
      setUsers(Array.isArray(data) ? data : data?.data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.displayName) return;
    await apiClient.post("/admin/users", form);
    setShowCreate(false);
    setForm({ email: "", password: "", displayName: "", role: "athlete" });
    fetchUsers();
  };

  const handleUpdate = async (id: string) => {
    await apiClient.put(`/admin/users/${id}`, editForm);
    setEditingId(null);
    fetchUsers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Er du sikker paa at du vil slette "${name}"?`)) return;
    await apiClient.delete(`/admin/users/${id}`);
    fetchUsers();
  };

  const handleResetPassword = async (id: string) => {
    const result: any = await apiClient.post(`/admin/users/${id}/reset-password`);
    setTempPassword(result?.tempPassword ?? result?.data?.tempPassword ?? null);
  };

  return (
    <div data-testid="admin-users-page" className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-foreground">Brugerstyring</h1>
          <span className="text-sm text-muted-foreground">({users.length} brugere)</span>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Opret bruger
        </button>
      </div>

      {/* Temp password display */}
      {tempPassword && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-foreground">Midlertidigt password: <code className="rounded bg-muted px-2 py-1 font-mono text-primary">{tempPassword}</code></p>
          <button onClick={() => setTempPassword(null)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">Luk</button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Ny bruger</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <input placeholder="Navn" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            <input placeholder="Password (min 8)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="athlete">Atlet</option>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Opret</button>
            <button onClick={() => setShowCreate(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground">Annuller</button>
          </div>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="p-3">Navn</th>
                <th className="p-3">Email</th>
                <th className="p-3">Rolle</th>
                <th className="p-3">Oprettet</th>
                <th className="p-3 text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/30">
                  <td className="p-3">
                    {editingId === user.id ? (
                      <input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                    ) : (
                      <span className="font-medium text-foreground">{user.displayName}</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{user.email}</td>
                  <td className="p-3">
                    {editingId === user.id ? (
                      <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="rounded border border-border bg-background px-2 py-1 text-xs">
                        <option value="athlete">Atlet</option><option value="coach">Coach</option><option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_BADGES[user.role] ?? "bg-muted text-muted-foreground"}`}>{user.role}</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString("da-DK")}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === user.id ? (
                        <>
                          <button onClick={() => handleUpdate(user.id)} className="rounded px-2 py-1 text-xs bg-primary text-primary-foreground">Gem</button>
                          <button onClick={() => setEditingId(null)} className="rounded px-2 py-1 text-xs text-muted-foreground">Annuller</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(user.id); setEditForm({ displayName: user.displayName, role: user.role }); }} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Rediger"><Edit2 size={14} /></button>
                          <button onClick={() => handleResetPassword(user.id)} className="rounded p-1 text-muted-foreground hover:text-amber-400" title="Nulstil password"><Key size={14} /></button>
                          <button onClick={() => handleDelete(user.id, user.displayName)} className="rounded p-1 text-muted-foreground hover:text-red-400" title="Slet"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
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
