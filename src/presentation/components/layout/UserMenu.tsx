import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, KeyRound } from "lucide-react";
import { useAuthStore } from "@/application/stores/authStore";
import ChangePasswordModal from "./ChangePasswordModal";

const ROLE_CONFIG: Record<string, { label: string; classes: string }> = {
  athlete: { label: "Atlet", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  coach: { label: "Traener", classes: "bg-green-500/10 text-green-400 border-green-500/20" },
  admin: { label: "Administrator", classes: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getFirstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export default function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

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
    function handleScroll() {
      setOpen(false);
    }
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
      const menuWidth = 260;
      const left = Math.max(8, rect.right - menuWidth);
      setPos({ top: rect.bottom + 4, left });
    }
    setOpen(!open);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login");
  };

  const handleChangePassword = () => {
    setOpen(false);
    setPasswordModalOpen(true);
  };

  if (!user) return null;

  const role = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.athlete;
  const initials = getInitials(user.displayName);
  const firstName = getFirstName(user.displayName);

  return (
    <>
      <button
        ref={btnRef}
        data-testid="user-menu-trigger"
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
      >
        {/* Avatar initials circle */}
        <div
          data-testid="user-avatar"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
        >
          {initials}
        </div>
        {/* First name - hidden on small screens */}
        <span data-testid="user-first-name" className="hidden text-foreground sm:inline">
          {firstName}
        </span>
        {/* Role badge */}
        <span
          data-testid="user-role-badge"
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${role.classes}`}
        >
          {role.label}
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          data-testid="user-menu-dropdown"
          className="fixed z-[100] min-w-[240px] rounded-md border border-border bg-card p-1 shadow-lg"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Header */}
          <div className="px-3 py-2">
            <p data-testid="user-menu-name" className="text-sm font-medium text-foreground">
              {user.displayName}
            </p>
            <p data-testid="user-menu-email" className="text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>

          {/* Separator */}
          <div className="my-1 h-px bg-border" />

          {/* Change password */}
          <button
            data-testid="user-menu-change-password"
            onClick={handleChangePassword}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <KeyRound size={14} className="text-muted-foreground" />
            Skift password
          </button>

          {/* Separator */}
          <div className="my-1 h-px bg-border" />

          {/* Logout */}
          <button
            data-testid="user-menu-logout"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} />
            Log ud
          </button>
        </div>
      )}

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </>
  );
}
