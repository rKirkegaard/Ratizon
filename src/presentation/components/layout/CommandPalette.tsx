import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/application/stores/authStore";
import {
  Search, LayoutDashboard, CalendarDays, FileBarChart2, TrendingUp,
  Activity, Heart, Footprints, Bike, Waves, Target, Flag, List,
  Upload, Wrench, Settings, Flame, Shield, Users,
} from "lucide-react";

interface CommandItem {
  group: string;
  label: string;
  path?: string;
  action?: string;
  icon: React.ReactNode;
  roles?: string[];
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { group: "Navigation", label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={14} /> },
  { group: "Navigation", label: "Kalender", path: "/kalender", icon: <CalendarDays size={14} /> },
  { group: "Navigation", label: "Ugerapport", path: "/ugerapport", icon: <FileBarChart2 size={14} /> },
  { group: "Navigation", label: "Performance", path: "/performance", icon: <TrendingUp size={14} /> },
  { group: "Navigation", label: "Load & Restitution", path: "/load-restitution", icon: <Activity size={14} /> },
  { group: "Navigation", label: "Wellness", path: "/wellness", icon: <Heart size={14} /> },
  { group: "Navigation", label: "Sammenligning", path: "/sammenligning", icon: <Activity size={14} /> },
  { group: "Navigation", label: "Test & Baselines", path: "/test-resultater", icon: <Flame size={14} /> },
  { group: "Navigation", label: "Loeb", path: "/disciplin/run", icon: <Footprints size={14} /> },
  { group: "Navigation", label: "Cykling", path: "/disciplin/bike", icon: <Bike size={14} /> },
  { group: "Navigation", label: "Svoemning", path: "/disciplin/swim", icon: <Waves size={14} /> },
  { group: "Navigation", label: "Saeson & Maal", path: "/saeson-maal", icon: <Target size={14} /> },
  { group: "Navigation", label: "Raceplan", path: "/raceplan", icon: <Flag size={14} /> },
  { group: "Navigation", label: "Sessioner", path: "/sessioner", icon: <List size={14} /> },
  { group: "Navigation", label: "Upload", path: "/upload", icon: <Upload size={14} /> },
  { group: "Navigation", label: "Udstyr", path: "/udstyr", icon: <Wrench size={14} /> },
  { group: "Navigation", label: "Indstillinger", path: "/indstillinger", icon: <Settings size={14} /> },
  // Admin
  { group: "Admin", label: "Brugere", path: "/admin/brugere", icon: <Shield size={14} />, roles: ["admin"] },
  { group: "Admin", label: "Tilknytninger", path: "/admin/tilknytninger", icon: <Users size={14} />, roles: ["admin"] },
  // Actions
  { group: "Handlinger", label: "Upload traeningsfil", path: "/upload", icon: <Upload size={14} /> },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore((s) => s.user);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands by role and search
  const filtered = useMemo(() => {
    const role = currentUser?.role;
    const available = COMMANDS.filter((c) => !c.roles || (role && c.roles.includes(role)));
    if (!query.trim()) return available;
    const q = query.toLowerCase();
    return available.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, currentUser]);

  // Group items
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filtered]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard handler
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[selectedIndex];
        if (item) handleSelect(item);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered, selectedIndex]);

  // Reset index when filter changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleSelect = (item: CommandItem) => {
    onClose();
    if (item.path && location.pathname !== item.path) {
      navigate(item.path);
    }
  };

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div data-testid="command-palette" className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            data-testid="command-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Soeg efter sider eller handlinger..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Ingen resultater.</div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</div>
                {items.map((item) => {
                  const idx = flatIndex++;
                  return (
                    <button
                      key={`${item.group}-${item.label}`}
                      onClick={() => handleSelect(item)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        idx === selectedIndex ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {item.path && location.pathname === item.path && (
                        <span className="ml-auto text-[10px] text-muted-foreground">Aktuel</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
