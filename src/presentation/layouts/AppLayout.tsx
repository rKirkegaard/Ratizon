import { useState, useMemo, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import UserMenu from "@/presentation/components/layout/UserMenu";
import CommandPalette from "@/presentation/components/layout/CommandPalette";
import AthleteSelector from "@/presentation/components/layout/AthleteSelector";
import CreateSessionDialog from "@/presentation/components/layout/CreateSessionDialog";
import { useAuthStore } from "@/application/stores/authStore";
import { apiClient } from "@/application/api/client";
import {
  LayoutDashboard,
  CalendarDays,
  FileBarChart2,
  TrendingUp,
  Activity,
  Heart,
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Mountain,
  Flame,
  UserCog,
  Target,
  Flag,
  List,
  Upload,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { useUiStore } from "@/application/stores/uiStore";
import { useAthleteStore } from "@/application/stores/athleteStore";

const ICON_MAP: Record<string, LucideIcon> = {
  waves: Waves,
  bike: Bike,
  footprints: Footprints,
  dumbbell: Dumbbell,
  mountain: Mountain,
  flame: Flame,
  heart: Heart,
  activity: Activity,
};

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const STATIC_SECTIONS_BEFORE: NavSection[] = [
  {
    title: "DAGLIGT",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "Kalender", path: "/kalender", icon: <CalendarDays size={18} /> },
    ],
  },
  {
    title: "ANALYSE",
    items: [
      { label: "Ugerapport", path: "/ugerapport", icon: <FileBarChart2 size={18} /> },
      { label: "Performance", path: "/performance", icon: <TrendingUp size={18} /> },
      { label: "Load & Restitution", path: "/load-restitution", icon: <Activity size={18} /> },
      { label: "Wellness", path: "/wellness", icon: <Heart size={18} /> },
      { label: "Sammenligning", path: "/sammenligning", icon: <Activity size={18} /> },
      { label: "Test & Baselines", path: "/test-resultater", icon: <Flame size={18} /> },
    ],
  },
];

const STATIC_SECTIONS_AFTER: NavSection[] = [
  {
    title: "PLAN & MAAL",
    items: [
      { label: "Saeson & Maal", path: "/saeson-maal", icon: <Target size={18} /> },
      { label: "Raceplan", path: "/raceplan", icon: <Flag size={18} /> },
    ],
  },
  {
    title: "DATA",
    items: [
      { label: "Sessioner", path: "/sessioner", icon: <List size={18} /> },
      { label: "Upload", path: "/upload", icon: <Upload size={18} /> },
      { label: "Udstyr", path: "/udstyr", icon: <Wrench size={18} /> },
    ],
  },
  {
    title: "INDSTILLINGER",
    items: [
      { label: "Atletdata", path: "/indstillinger/atletprofil", icon: <UserCog size={18} /> },
      { label: "App & Zoner", path: "/indstillinger", icon: <Settings size={18} /> },
    ],
  },
  {
    title: "DEV",
    items: [
      { label: "UX Test Lab", path: "/ux-test", icon: <Flame size={18} /> },
    ],
  },
];

const ADMIN_SECTION: NavSection = {
  title: "ADMIN",
  items: [
    { label: "Brugere", path: "/admin/brugere", icon: <Settings size={18} /> },
    { label: "Tilknytninger", path: "/admin/tilknytninger", icon: <Activity size={18} /> },
    { label: "System Indstillinger", path: "/admin/indstillinger", icon: <Wrench size={18} /> },
  ],
};

// Fallback discipline items when no sport configs are loaded
const FALLBACK_DISCIPLINE_ITEMS: NavItem[] = [
  { label: "Lob", path: "/disciplin/run", icon: <Footprints size={18} /> },
  { label: "Cykling", path: "/disciplin/bike", icon: <Bike size={18} /> },
  { label: "Svomning", path: "/disciplin/swim", icon: <Waves size={18} /> },
];

export default function AppLayout() {
  const { sidebarCollapsed, setSidebarCollapsed, aiPanelOpen, setAiPanelOpen, collapsedSections, toggleSection } = useUiStore();
  const currentUser = useAuthStore((s) => s.user);
  const selectedAthleteId = useAthleteStore((s) => s.selectedAthleteId);
  const canSelectAthletes = currentUser?.role === "coach" || currentUser?.role === "admin";
  const getSportsWithPages = useAthleteStore((s) => s.getSportsWithPages);
  const [aiInput, setAiInput] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [allowedPages, setAllowedPages] = useState<Set<string> | null>(null); // null = all allowed

  // Fetch page permissions for athletes
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "admin" || currentUser.role === "coach") {
      setAllowedPages(null); // full access
      return;
    }
    // Athletes: check permissions
    apiClient.get<any>(`/permissions/user/${currentUser.id}`).then((data) => {
      const perms = data?.permissions ?? data?.data?.permissions ?? [];
      const allowed = new Set<string>();
      for (const p of perms) {
        if (p.has_access) allowed.add(p.page_key);
      }
      setAllowedPages(allowed.size > 0 ? allowed : null);
    }).catch(() => setAllowedPages(null));
  }, [currentUser]);

  // Ctrl+K shortcut for command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navSections = useMemo(() => {
    const sportsWithPages = getSportsWithPages();

    const disciplineItems: NavItem[] =
      sportsWithPages.length > 0
        ? sportsWithPages.map((sport) => {
            const IconComponent = ICON_MAP[sport.icon] ?? Activity;
            return {
              label: sport.display_name,
              path: `/disciplin/${sport.sport_key}`,
              icon: <IconComponent size={18} style={{ color: sport.color }} />,
            };
          })
        : FALLBACK_DISCIPLINE_ITEMS;

    const disciplineSection: NavSection = {
      title: "DISCIPLIN",
      items: disciplineItems,
    };

    let sections = [...STATIC_SECTIONS_BEFORE, disciplineSection, ...STATIC_SECTIONS_AFTER];

    // Add ADMIN section for admin users
    try {
      const stored = localStorage.getItem("ratizon-auth");
      if (stored) {
        const role = JSON.parse(stored)?.state?.user?.role;
        if (role === "admin") sections.push(ADMIN_SECTION);
      }
    } catch { /* ignore */ }

    // Filter by page permissions (for athletes)
    if (allowedPages) {
      const routeToPermKey: Record<string, string> = {
        "/dashboard": "dashboard", "/kalender": "calendar",
        "/ugerapport": "weekly-report", "/performance": "performance",
        "/load-restitution": "load-recovery", "/wellness": "wellness",
        "/sammenligning": "comparison", "/test-resultater": "test-baselines",
        "/saeson-maal": "season-goals", "/raceplan": "raceplan",
        "/sessioner": "sessions", "/upload": "upload", "/udstyr": "equipment",
        "/indstillinger": "settings", "/indstillinger/atletprofil": "settings",
      };
      sections = sections.map((s) => ({
        ...s,
        items: s.items.filter((item) => {
          const permKey = routeToPermKey[item.path];
          if (!permKey) return true; // no permission mapping = always show
          return allowedPages.has(permKey);
        }),
      })).filter((s) => s.items.length > 0);
    }

    return sections;
  }, [getSportsWithPages, allowedPages]);

  return (
    <div data-testid="app-layout" className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`flex flex-col border-r border-border bg-card transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-52"
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          {!sidebarCollapsed && (
            <span className="text-lg font-bold tracking-tight text-primary">Ratizon</span>
          )}
          <button
            data-testid="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav data-testid="sidebar-nav" className="flex-1 overflow-y-auto py-2">
          {navSections.map((section) => {
            const isCollapsed = !!collapsedSections[section.title];
            return (
              <div key={section.title} data-testid={`nav-section-${section.title.toLowerCase()}`} className="mb-1">
                {!sidebarCollapsed ? (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex w-full items-center justify-between px-3 mx-1 py-1.5 mt-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground"
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                    />
                  </button>
                ) : (
                  <div className="my-1 mx-3 h-px bg-border" />
                )}
                {!isCollapsed &&
                  section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      data-testid={`nav-item-${item.path.replace(/\//g, "-").slice(1)}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-accent text-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        } ${sidebarCollapsed ? "justify-center px-2" : ""}`
                      }
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {item.icon}
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  ))}
              </div>
            );
          })}
        </nav>
        {/* Athlete selector */}
        <AthleteSelector collapsed={sidebarCollapsed} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          data-testid="top-bar"
          className="flex h-14 items-center justify-end gap-3 border-b border-border px-6"
        >
          {/* Search / Command palette trigger */}
          <button
            data-testid="command-trigger"
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <span className="text-xs">Soeg...</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] border border-border">Ctrl+K</kbd>
          </button>
          {/* Create session */}
          <button
            data-testid="create-session-trigger"
            onClick={() => setCreateSessionOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <span>+ Opret</span>
          </button>
          {/* AI Coach toggle */}
          <button
            data-testid="ai-chat-toggle"
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20"
          >
            <MessageCircle size={16} />
            {!aiPanelOpen && <span>AI Coach</span>}
          </button>
          {/* User menu */}
          <UserMenu />
        </header>
        {/* Command palette */}
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
        {/* Create session dialog */}
        <CreateSessionDialog open={createSessionOpen} onClose={() => setCreateSessionOpen(false)} />

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>

          {/* AI Chat Panel */}
          {aiPanelOpen && (
            <aside
              data-testid="ai-panel"
              className="flex w-80 flex-col border-l border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">AI Coach</span>
                <button
                  onClick={() => setAiPanelOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-sm text-muted-foreground">
                  Stil et spoergsmaal om din traening...
                </p>
              </div>
              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <input
                    data-testid="ai-input"
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Skriv her..."
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                  <button className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                    Send
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
