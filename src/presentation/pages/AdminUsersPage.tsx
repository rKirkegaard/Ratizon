import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/application/api/client";
import { useAuthStore } from "@/application/stores/authStore";
import {
  Users, UserCog, Shield, Plus, Search, MoreHorizontal,
  Edit2, ShieldCheck, Lock, KeyRound, Power, Trash2,
  Loader2, Copy, Check, X, Bot, Cpu,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  role: "athlete" | "coach" | "admin";
  isActive: boolean;
  athleteId: string | null;
  createdAt: string;
}

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "athlete" | "coach" | "admin";
}

interface EditUserData {
  firstName: string;
  lastName: string;
  role: "athlete" | "coach" | "admin";
  isActive: boolean;
}

interface PageInfo { key: string; label: string; description: string }
interface SectionInfo { title: string; pages: PageInfo[] }
interface PagePermission { page_key: string; has_access: boolean }

// ── Constants ─────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = { athlete: "Atlet", coach: "Traener", admin: "Administrator" };
const ROLE_BADGE: Record<string, string> = {
  athlete: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  coach: "bg-green-500/10 text-green-400 border-green-500/20",
  admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

import { LLM_PROVIDERS, getModelsForProvider } from "@/domain/constants/llmProviders";

// ── Dialog Shell ──────────────────────────────────────────────────────

function Dialog({ open, onClose, wide, children }: { open: boolean; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div data-testid="dialog-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className={`${wide ? "max-w-2xl" : "max-w-lg"} w-full rounded-lg border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ── Dropdown Menu (portal-style, outside table overflow) ──────────────

function DropdownMenu({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = 280; // approximate dropdown height
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom + 4;
      setPos({ top: Math.max(8, top), left: rect.right - 220 });
    }
    setOpen(!open);
  };

  return (
    <>
      <button ref={btnRef} onClick={handleToggle} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
        {trigger}
      </button>
      {open && (
        <div
          ref={menuRef}
          data-testid="action-dropdown"
          className="fixed z-[100] min-w-[220px] rounded-md border border-border bg-card p-1 shadow-lg"
          style={{ top: pos.top, left: pos.left }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </>
  );
}

function DropdownItem({ icon, label, onClick, disabled, destructive }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm ${
        disabled ? "opacity-40 cursor-not-allowed" : destructive ? "text-red-400 hover:bg-red-500/10" : "text-foreground hover:bg-accent"
      }`}
    >
      {icon}{label}
    </button>
  );
}

function DropdownSep() { return <div className="my-1 h-px bg-border" />; }

// ── Toggle Switch ─────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"} ${disabled ? "opacity-40" : ""}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

// ── LLM Config Inline ─────────────────────────────────────────────────

function LlmConfigInline({ onChange }: { onChange: (data: { provider: string; model: string; isEnabled: boolean }) => void }) {
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => { onChange({ provider, model, isEnabled }); }, [provider, model, isEnabled]);

  const filteredModels = getModelsForProvider(provider);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Bot className="h-4 w-4 text-primary" /> LLM Konfiguration
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Udbyder</label>
        <select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(""); }} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="">Vaelg udbyder</option>
          {LLM_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Model</label>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="">Vaelg model</option>
          {filteredModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <div className="text-sm font-medium text-foreground">AI Aktiveret</div>
          <div className="text-xs text-muted-foreground">Aktiver AI-funktioner for denne atlet</div>
        </div>
        <Toggle checked={isEnabled} onChange={setIsEnabled} />
      </div>
    </div>
  );
}

// ── Permissions Dialog ────────────────────────────────────────────────

function PermissionsDialog({ open, onClose, target }: {
  open: boolean;
  onClose: () => void;
  target: { userId: string; name: string } | null;
}) {
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !target) return;
    setLoading(true);
    Promise.all([
      apiClient.get<any>("/permissions/pages"),
      apiClient.get<any>(`/permissions/user/${target.userId}`),
    ]).then(([pagesData, permData]) => {
      const raw = pagesData?.data ?? pagesData ?? {};
      const secs: SectionInfo[] = raw?.sections ?? [];
      setSections(secs);
      const perms = permData?.permissions ?? permData?.data?.permissions ?? [];
      setPermissions(perms);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, target]);

  const togglePerm = (pageKey: string) => {
    setPermissions((prev) => prev.map((p) => p.page_key === pageKey ? { ...p, has_access: !p.has_access } : p));
  };

  const toggleSection = (sectionPages: PageInfo[], enable: boolean) => {
    const keys = new Set(sectionPages.map((p) => p.key));
    setPermissions((prev) => prev.map((p) => keys.has(p.page_key) ? { ...p, has_access: enable } : p));
  };

  const enableAll = () => setPermissions((prev) => prev.map((p) => ({ ...p, has_access: true })));
  const disableAll = () => setPermissions((prev) => prev.map((p) => ({ ...p, has_access: false })));

  const handleSave = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await apiClient.put(`/permissions/user/${target.userId}`, { permissions });
      onClose();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const enabledCount = permissions.filter((p) => p.has_access).length;
  const getPerm = (key: string) => permissions.find((p) => p.page_key === key)?.has_access ?? true;
  const sectionEnabledCount = (pages: PageInfo[]) => pages.filter((p) => getPerm(p.key)).length;

  return (
    <Dialog open={open} onClose={onClose} wide>
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Siderettigheder</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Vaelg hvilke sider {target?.name} har adgang til</p>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {/* Quick actions */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm text-muted-foreground">{enabledCount} af {permissions.length} sider aktiveret</span>
            <div className="flex gap-2">
              <button onClick={enableAll} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent">
                <Check className="h-3 w-3" /> Aktiver alle
              </button>
              <button onClick={disableAll} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent">
                <X className="h-3 w-3" /> Deaktiver alle
              </button>
            </div>
          </div>

          {/* Permission toggles grouped by section */}
          <div className="max-h-[450px] space-y-4 overflow-y-auto pr-1">
            {sections.map((section) => {
              const sEnabled = sectionEnabledCount(section.pages);
              const allEnabled = sEnabled === section.pages.length;
              return (
                <div key={section.title}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</span>
                    <button
                      onClick={() => toggleSection(section.pages, !allEnabled)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      {allEnabled ? "Deaktiver sektion" : "Aktiver sektion"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {section.pages.map((page) => (
                      <div key={page.key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <div>
                          <div className="text-sm font-medium text-foreground">{page.label}</div>
                          <div className="text-[11px] text-muted-foreground">{page.description}</div>
                        </div>
                        <Toggle checked={getPerm(page.key)} onChange={() => togglePerm(page.key)} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
        <button onClick={handleSave} disabled={saving || loading} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Gem rettigheder
        </button>
      </div>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserData>({ email: "", password: "", firstName: "", lastName: "", role: "athlete" });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editData, setEditData] = useState<EditUserData>({ firstName: "", lastName: "", role: "athlete", isActive: true });
  const [updating, setUpdating] = useState(false);
  const llmConfigRef = useRef<{ provider: string; model: string; isEnabled: boolean } | null>(null);

  // Set password dialog
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);

  // Temp password dialog
  const [tempPasswordOpen, setTempPasswordOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [tempPasswordUser, setTempPasswordUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Permissions dialog
  const [permOpen, setPermOpen] = useState(false);
  const [permTarget, setPermTarget] = useState<{ userId: string; name: string } | null>(null);

  // AI settings dialog
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiSettingsUser, setAiSettingsUser] = useState<User | null>(null);
  const [aiProvider, setAiProvider] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      const data: any = await apiClient.get("/admin/users");
      setUsersList(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = usersList.filter((u) => {
    const term = searchTerm.toLowerCase();
    return u.email.toLowerCase().includes(term) || (u.firstName || "").toLowerCase().includes(term) || (u.lastName || "").toLowerCase().includes(term) || u.displayName.toLowerCase().includes(term);
  });

  // ── Handlers ──────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName) return;
    setCreating(true);
    try { await apiClient.post("/admin/users", newUser); setCreateOpen(false); setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "athlete" }); fetchUsers(); } catch { /* ignore */ }
    setCreating(false);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditData({ firstName: user.firstName || user.displayName.split(" ")[0] || "", lastName: user.lastName || user.displayName.split(" ").slice(1).join(" ") || "", role: user.role, isActive: user.isActive });
    llmConfigRef.current = null;
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingUser || !editData.firstName || !editData.lastName) return;
    if (editingUser.id === currentUser?.id && (editData.role !== "admin" || !editData.isActive)) return;
    setUpdating(true);
    try { await apiClient.put(`/admin/users/${editingUser.id}`, editData); setEditOpen(false); setEditingUser(null); fetchUsers(); } catch { /* ignore */ }
    setUpdating(false);
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) return;
    try { await apiClient.put(`/admin/users/${user.id}`, { isActive: !user.isActive }); fetchUsers(); } catch { /* ignore */ }
  };

  const openSetPassword = (user: User) => { setPasswordUser(user); setNewPassword(""); setConfirmPassword(""); setSetPasswordOpen(true); };

  const handleSetPassword = async () => {
    if (!passwordUser || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword) return;
    setSettingPassword(true);
    try { await apiClient.put(`/admin/users/${passwordUser.id}/password`, { password: newPassword }); setSetPasswordOpen(false); setPasswordUser(null); } catch { /* ignore */ }
    setSettingPassword(false);
  };

  const handleResetPassword = async (user: User) => {
    try {
      const result: any = await apiClient.post(`/admin/users/${user.id}/reset-password`);
      const tp = result?.tempPassword ?? result?.data?.tempPassword ?? "";
      setTempPasswordUser(user);
      setTempPassword(tp);
      setTempPasswordOpen(true);
    } catch { /* ignore */ }
  };

  const handleCopyTempPassword = async () => {
    try { await navigator.clipboard.writeText(tempPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const openDelete = (user: User) => { if (user.id === currentUser?.id) return; setDeletingUser(user); setDeleteOpen(true); };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try { await apiClient.delete(`/admin/users/${deletingUser.id}`); setDeleteOpen(false); setDeletingUser(null); fetchUsers(); } catch { /* ignore */ }
    setDeleting(false);
  };

  const openPermissions = (user: User) => {
    setPermTarget({ userId: user.id, name: userName(user) });
    setPermOpen(true);
  };

  const openAiSettings = (user: User) => {
    setAiSettingsUser(user);
    setAiProvider("");
    setAiModel("");
    setAiEnabled(false);
    setAiSettingsOpen(true);
  };

  const handleSaveAiSettings = async () => {
    if (!aiSettingsUser) return;
    setAiSaving(true);
    // Save via LLM preferences endpoint if athlete has athleteId
    if (aiSettingsUser.athleteId) {
      await apiClient.put(`/llm/preferences/${aiSettingsUser.athleteId}`, {
        inheritFromSystem: !aiEnabled,
        preferredProvider: aiProvider || null,
        preferredModel: aiModel || null,
      }).catch(() => {});
    }
    setAiSettingsOpen(false);
    setAiSaving(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────

  const isSelf = (id: string) => id === currentUser?.id;
  const userName = (u: User) => u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.displayName;
  const athleteCount = usersList.filter((u) => u.role === "athlete").length;
  const coachCount = usersList.filter((u) => u.role === "coach").length;
  const adminCount = usersList.filter((u) => u.role === "admin").length;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div data-testid="admin-users-page" className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brugeradministration</h1>
          <p className="text-sm text-muted-foreground">Administrer brugere, roller og tilladelser</p>
        </div>
        <button data-testid="create-user-btn" onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Opret bruger
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: <Users className="h-5 w-5 text-blue-400" />, bg: "bg-blue-500/10", count: athleteCount, label: "Atleter" },
          { icon: <UserCog className="h-5 w-5 text-green-400" />, bg: "bg-green-500/10", count: coachCount, label: "Traenere" },
          { icon: <Shield className="h-5 w-5 text-purple-400" />, bg: "bg-purple-500/10", count: adminCount, label: "Administratorer" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <div className={`rounded-lg p-2 ${s.bg}`}>{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-foreground">{s.count}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input data-testid="user-search" type="text" placeholder="Soeg efter brugere..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="p-3">Bruger</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rolle</th>
              <th className="p-3">Status</th>
              <th className="p-3">Oprettet</th>
              <th className="p-3 text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Ingen brugere fundet</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} data-testid={`user-row-${user.id}`} className="border-b border-border/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-foreground">
                        {(user.firstName || user.displayName || "?").charAt(0)}{(user.lastName || "").charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{userName(user)}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{user.email}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role] ?? ""}`}>{ROLE_LABELS[user.role] ?? user.role}</span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${user.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                      {user.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString("da-DK")}</td>
                  <td className="p-3 text-right">
                    <DropdownMenu trigger={<MoreHorizontal className="h-4 w-4" />}>
                      <DropdownItem icon={<Edit2 className="h-4 w-4" />} label="Rediger" onClick={() => openEdit(user)} />
                      {(user.role === "athlete" || user.role === "coach") && (
                        <DropdownItem icon={<ShieldCheck className="h-4 w-4" />} label="Siderettigheder" onClick={() => openPermissions(user)} />
                      )}
                      {user.role === "athlete" && user.athleteId && (
                        <DropdownItem icon={<Cpu className="h-4 w-4" />} label="AI Indstillinger" onClick={() => openAiSettings(user)} />
                      )}
                      <DropdownSep />
                      <DropdownItem icon={<Lock className="h-4 w-4" />} label="Saet password" onClick={() => openSetPassword(user)} />
                      <DropdownItem icon={<KeyRound className="h-4 w-4" />} label="Nulstil password" onClick={() => handleResetPassword(user)} />
                      <DropdownSep />
                      <DropdownItem icon={<Power className="h-4 w-4" />} label={user.isActive ? "Deaktiver" : "Aktiver"} onClick={() => handleToggleActive(user)} disabled={isSelf(user.id)} />
                      <DropdownSep />
                      <DropdownItem icon={<Trash2 className="h-4 w-4" />} label="Slet bruger" onClick={() => openDelete(user)} disabled={isSelf(user.id)} destructive />
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create User Dialog ─────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <h2 className="text-lg font-semibold text-foreground">Opret ny bruger</h2>
        <p className="mb-4 text-sm text-muted-foreground">Udfyld informationerne for den nye bruger</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Fornavn</label>
              <input data-testid="create-firstName" value={newUser.firstName} onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))} placeholder="John" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Efternavn</label>
              <input data-testid="create-lastName" value={newUser.lastName} onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))} placeholder="Doe" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <input data-testid="create-email" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="john@example.com" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Adgangskode</label>
            <input data-testid="create-password" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} placeholder="Mindst 8 tegn" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Rolle</label>
            <select data-testid="create-role" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as any }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="athlete">Atlet</option><option value="coach">Traener</option><option value="admin">Administrator</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setCreateOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button data-testid="create-submit" onClick={handleCreate} disabled={creating} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {creating && <Loader2 className="h-4 w-4 animate-spin" />} Opret bruger
          </button>
        </div>
      </Dialog>

      {/* ── Edit User Dialog ───────────────────────────────────────── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <h2 className="text-lg font-semibold text-foreground">Rediger bruger</h2>
        <p className="mb-4 text-sm text-muted-foreground">Opdater informationerne for {editingUser ? userName(editingUser) : ""}</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Fornavn</label>
              <input data-testid="edit-firstName" value={editData.firstName} onChange={(e) => setEditData((p) => ({ ...p, firstName: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Efternavn</label>
              <input data-testid="edit-lastName" value={editData.lastName} onChange={(e) => setEditData((p) => ({ ...p, lastName: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <input value={editingUser?.email || ""} disabled className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" />
            <p className="mt-0.5 text-[10px] text-muted-foreground">Email kan ikke aendres</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Rolle</label>
            <select data-testid="edit-role" value={editData.role} onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value as any }))} disabled={editingUser ? isSelf(editingUser.id) : false} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:bg-muted disabled:text-muted-foreground">
              <option value="athlete">Atlet</option><option value="coach">Traener</option><option value="admin">Administrator</option>
            </select>
            {editingUser && isSelf(editingUser.id) && <p className="mt-0.5 text-[10px] text-muted-foreground">Du kan ikke aendre din egen rolle</p>}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium text-foreground">Aktiv bruger</div>
              <div className="text-xs text-muted-foreground">Inaktive brugere kan ikke logge ind</div>
            </div>
            <Toggle checked={editData.isActive} onChange={(v) => setEditData((p) => ({ ...p, isActive: v }))} disabled={editingUser ? isSelf(editingUser.id) : false} />
          </div>
          {editData.role === "athlete" && editingUser?.athleteId && (
            <>
              <div className="my-2 h-px bg-border" />
              <LlmConfigInline onChange={(data) => { llmConfigRef.current = data; }} />
            </>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setEditOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button data-testid="edit-submit" onClick={handleUpdate} disabled={updating} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {updating && <Loader2 className="h-4 w-4 animate-spin" />} Gem aendringer
          </button>
        </div>
      </Dialog>

      {/* ── Set Password Dialog ────────────────────────────────────── */}
      <Dialog open={setPasswordOpen} onClose={() => setSetPasswordOpen(false)}>
        <h2 className="text-lg font-semibold text-foreground">Saet password</h2>
        <p className="mb-4 text-sm text-muted-foreground">Saet et nyt password for {passwordUser ? userName(passwordUser) : ""}</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nyt password</label>
            <input data-testid="set-password-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mindst 8 tegn" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Bekraeft password</label>
            <input data-testid="confirm-password-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Gentag password" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-400">Passwords matcher ikke</p>}
          {newPassword && newPassword.length > 0 && newPassword.length < 8 && <p className="text-xs text-red-400">Password skal vaere mindst 8 tegn</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setSetPasswordOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button data-testid="set-password-submit" onClick={handleSetPassword} disabled={settingPassword || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {settingPassword && <Loader2 className="h-4 w-4 animate-spin" />} Saet password
          </button>
        </div>
      </Dialog>

      {/* ── Temp Password Dialog ───────────────────────────────────── */}
      <Dialog open={tempPasswordOpen} onClose={() => setTempPasswordOpen(false)}>
        <h2 className="text-lg font-semibold text-foreground">Midlertidigt password</h2>
        <p className="mb-4 text-sm text-muted-foreground">Et midlertidigt password er genereret for {tempPasswordUser ? userName(tempPasswordUser) : ""}. Brugeren skal skifte password ved naeste login.</p>
        <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
          <code className="flex-1 text-center font-mono text-lg font-semibold text-foreground">{tempPassword}</code>
          <button data-testid="copy-temp-password" onClick={handleCopyTempPassword} className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground">
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Kopier dette password og del det med brugeren</p>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setTempPasswordOpen(false)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Luk</button>
        </div>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <h2 className="text-lg font-semibold text-foreground">Slet bruger</h2>
        <p className="mb-4 text-sm text-muted-foreground">Er du sikker paa, at du vil slette {deletingUser ? userName(deletingUser) : ""} ({deletingUser?.email})? Denne handling kan ikke fortrydes.</p>
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm text-red-400"><strong>Advarsel:</strong> Denne handling sletter permanent brugeren og alle tilknyttede data, herunder traener-tildelinger og atlet-profil.</p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setDeleteOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button data-testid="delete-confirm" onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Slet bruger
          </button>
        </div>
      </Dialog>

      {/* ── Permissions Dialog ─────────────────────────────────────── */}
      <PermissionsDialog open={permOpen} onClose={() => setPermOpen(false)} target={permTarget} />

      {/* ── AI Settings Dialog ─────────────────────────────────────── */}
      <Dialog open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)}>
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI Indstillinger</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Konfigurer AI for {aiSettingsUser ? userName(aiSettingsUser) : ""}</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium text-foreground">AI Aktiveret</div>
              <div className="text-xs text-muted-foreground">Aktiver AI-funktioner for denne bruger</div>
            </div>
            <Toggle checked={aiEnabled} onChange={setAiEnabled} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Udbyder</label>
            <select value={aiProvider} onChange={(e) => { setAiProvider(e.target.value); setAiModel(""); }} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="">Vaelg udbyder (system standard)</option>
              {LLM_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Model</label>
            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="">Vaelg model (system standard)</option>
              {getModelsForProvider(aiProvider).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            <span>API Noegle: System noegle</span>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setAiSettingsOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button onClick={handleSaveAiSettings} disabled={aiSaving} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {aiSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Gem indstillinger
          </button>
        </div>
      </Dialog>
    </div>
  );
}
