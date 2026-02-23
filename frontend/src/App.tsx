import { useState } from "react";
import {
  IconBell,
  IconBuilding,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconLogout,
  IconSearch,
  IconUsers,
} from "./components/icons";
import { AnfitrioesPage } from "./pages/AnfitrioesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImoveisPage } from "./pages/ImoveisPage";
import { ReservasPage } from "./pages/ReservasPage";

type PageId = "dashboard" | "imoveis" | "anfitrioes" | "reservas";

const NAV = [
  { id: "dashboard" as PageId, label: "Dashboard", icon: <IconHome /> },
  { id: "imoveis" as PageId, label: "Imóveis", icon: <IconBuilding /> },
  { id: "anfitrioes" as PageId, label: "Anfitriões", icon: <IconUsers /> },
  { id: "reservas" as PageId, label: "Reservas", icon: <IconCalendar /> },
];

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "Dashboard",
  imoveis: "Imóveis",
  anfitrioes: "Anfitriões",
  reservas: "Reservas",
};

const Sidebar = ({
  current,
  onNavigate,
  collapsed,
  onToggle,
}: {
  current: PageId;
  onNavigate: (p: PageId) => void;
  collapsed: boolean;
  onToggle: () => void;
}) => (
  <aside
    className={`fixed top-0 left-0 h-full z-30 bg-white border-r border-stone-100 flex flex-col shadow-sm transition-all duration-300 ${collapsed ? "w-[68px]" : "w-60"}`}
  >
    <div className="flex items-center gap-3 px-4 py-5 border-b border-stone-100">
      <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
          <path d="M9 21V12h6v9" fill="rgba(0,0,0,0.15)" />
        </svg>
      </div>
      {!collapsed && (
        <span className="text-stone-800 font-bold text-lg tracking-tight">
          Hostly
        </span>
      )}
      <button
        onClick={onToggle}
        className={`text-stone-300 hover:text-stone-500 transition-colors ${collapsed ? "mx-auto" : "ml-auto"}`}
      >
        {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
      </button>
    </div>
    <nav className="flex-1 py-4 px-2 space-y-1">
      {NAV.map((item) => {
        const active = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${active ? "bg-amber-500 text-white shadow-sm" : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"}
              ${collapsed ? "justify-center" : ""}`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </nav>
    <div
      className={`px-2 pb-4 pt-3 border-t border-stone-100 ${collapsed ? "flex justify-center" : ""}`}
    >
      {collapsed ? (
        <button className="w-9 h-9 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors">
          <IconLogout />
        </button>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-50 cursor-pointer transition-colors group">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            RX
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-stone-700 truncate">
              Rafael Xavier
            </p>
            <p className="text-xs text-stone-400">Administrador</p>
          </div>
          <span className="text-stone-300 group-hover:text-stone-500 transition-colors">
            <IconLogout />
          </span>
        </div>
      )}
    </div>
  </aside>
);

const Header = ({
  current,
  sidebarWidth,
}: {
  current: PageId;
  sidebarWidth: number;
}) => (
  <header
    className="fixed top-0 right-0 z-20 h-16 bg-white border-b border-stone-100 flex items-center gap-4 px-6 transition-all duration-300"
    style={{ left: sidebarWidth }}
  >
    <div className="flex-1 flex items-center gap-2">
      <h2 className="font-semibold text-stone-800">{PAGE_TITLES[current]}</h2>
    </div>
    <div className="hidden md:flex items-center gap-2 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 w-56">
      <span className="text-stone-400">
        <IconSearch />
      </span>
      <input
        className="bg-transparent text-sm text-stone-600 placeholder-stone-400 outline-none w-full"
        placeholder="Buscar..."
      />
    </div>
    <button className="relative w-9 h-9 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors">
      <IconBell />
      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
    </button>
  </header>
);

export default function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 68 : 240;

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <DashboardPage />;
      case "imoveis":
        return <ImoveisPage />;
      case "anfitrioes":
        return <AnfitrioesPage />;
      case "reservas":
        return <ReservasPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Sidebar
        current={page}
        onNavigate={setPage}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <Header current={page} sidebarWidth={sidebarWidth} />
        <main className="pt-16 min-h-screen">
          <div className="max-w-5xl mx-auto px-6 py-8">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}
