import { useState, useEffect, useRef } from "react";
import { ChevronUp } from "lucide-react";
import { useAuthStore } from "@/application/stores/authStore";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { apiClient } from "@/application/api/client";

interface AthleteOption {
  athleteId: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl?: string | null;
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

interface AthleteSelectorProps {
  collapsed: boolean;
}

export default function AthleteSelector({ collapsed }: AthleteSelectorProps) {
  const user = useAuthStore((s) => s.user);
  const { selectedAthleteId, setSelectedAthleteId } = useAthleteStore();
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canSelect = user?.role === "coach" || user?.role === "admin";

  useEffect(() => {
    apiClient.get<any>("/athletes").then((data) => {
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setAthletes(list);
      // Auto-select first if nothing selected
      if (!selectedAthleteId && list.length > 0) {
        setSelectedAthleteId(list[0].athleteId);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selected = athletes.find((a) => a.athleteId === selectedAthleteId);
  const displayName = selected
    ? selected.firstName && selected.lastName
      ? `${selected.firstName} ${selected.lastName}`
      : selected.displayName
    : "Ingen atlet";

  if (athletes.length === 0) return null;

  const handleSelect = (id: string) => {
    setSelectedAthleteId(id);
    setOpen(false);
  };

  return (
    <div ref={ref} data-testid="athlete-selector" className="relative border-t border-border">
      <button
        onClick={() => canSelect && setOpen(!open)}
        className={`w-full flex items-center gap-3 p-3 transition-colors ${canSelect ? "hover:bg-accent/50 cursor-pointer" : ""} ${collapsed ? "justify-center" : ""}`}
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 text-xs font-medium text-white ring-2 ring-border overflow-hidden">
          {selected?.profileImageUrl ? (
            <img src={selected.profileImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            getInitials(displayName)
          )}
        </div>
        {/* Info */}
        {!collapsed && (
          <div className="flex-1 text-left min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Aktiv atlet</div>
            <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
          </div>
        )}
        {!collapsed && canSelect && <ChevronUp size={14} className="text-muted-foreground" />}
      </button>

      {/* Dropdown */}
      {open && canSelect && (
        <div className="absolute bottom-full left-0 right-0 mb-1 max-h-60 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg z-50">
          {athletes.map((a) => {
            const name = a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.displayName;
            const isActive = a.athleteId === selectedAthleteId;
            return (
              <button
                key={a.athleteId}
                onClick={() => handleSelect(a.athleteId)}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors ${
                  isActive ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 text-[10px] text-white overflow-hidden">
                  {a.profileImageUrl ? (
                    <img src={a.profileImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(name)
                  )}
                </div>
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
