import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
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
  Target,
  List,
  Upload,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  X,
} from "lucide-react";
import { useUiStore } from "@/application/stores/uiStore";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
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
    ],
  },
  {
    title: "DISCIPLIN",
    items: [
      { label: "Lob", path: "/loeb", icon: <Footprints size={18} /> },
      { label: "Cykling", path: "/cykling", icon: <Bike size={18} /> },
      { label: "Svomning", path: "/svoemning", icon: <Waves size={18} /> },
    ],
  },
  {
    title: "PLAN & MAAL",
    items: [
      { label: "Saeson & Maal", path: "/saeson-maal", icon: <Target size={18} /> },
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
      { label: "App & Zoner", path: "/indstillinger", icon: <Settings size={18} /> },
    ],
  },
];

export default function AppLayout() {
  const { sidebarCollapsed, setSidebarCollapsed, aiPanelOpen, setAiPanelOpen } = useUiStore();
  const [aiInput, setAiInput] = useState("");

  return (
    <div data-testid="app-layout" className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`flex flex-col border-r border-border bg-card transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-60"
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
        <nav className="flex-1 overflow-y-auto py-2">
          {navSections.map((section) => (
            <div key={section.title} className="mb-2">
              {!sidebarCollapsed && (
                <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
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
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          data-testid="top-bar"
          className="flex h-14 items-center justify-end border-b border-border px-6"
        >
          <button
            data-testid="ai-chat-toggle"
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20"
          >
            <MessageCircle size={16} />
            {!aiPanelOpen && <span>AI Coach</span>}
          </button>
        </header>

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
