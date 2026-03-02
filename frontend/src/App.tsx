import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import logoImg from "./assets/logo.png";
import { AnfitrioesPage } from "./pages/AnfitrioesPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImoveisPage } from "./pages/ImoveisPage";
import { ReservasPage } from "./pages/ReservasPage";
import { authService, hasSessionToken, type Usuario } from "./services/api";

type PageId =
  | "dashboard"
  | "imoveis"
  | "anfitrioes"
  | "reservas"
  | "meusImoveis"
  | "minhasReservas"
  | "reservasRecebidas"
  | "explorar";

type NavItem = { id: PageId; label: string; icon: ReactNode };

function getNav(user: Usuario): NavItem[] {
  if (user.tipo === "ADMIN") {
    return [
      { id: "dashboard", label: "Dashboard", icon: <IconHome /> },
      { id: "imoveis", label: "Imóveis", icon: <IconBuilding /> },
      { id: "anfitrioes", label: "Usuários", icon: <IconUsers /> },
      { id: "reservas", label: "Reservas", icon: <IconCalendar /> },
    ];
  }

  if (user.tipo === "ANFITRIAO") {
    return [
      { id: "meusImoveis", label: "Meus Imóveis", icon: <IconBuilding /> },
      {
        id: "reservasRecebidas",
        label: "Reservas nos Imóveis",
        icon: <IconCalendar />,
      },
      {
        id: "minhasReservas",
        label: "Minhas Reservas",
        icon: <IconCalendar />,
      },
    ];
  }

  return [
    { id: "explorar", label: "Explorar Imóveis", icon: <IconBuilding /> },
    { id: "minhasReservas", label: "Minhas Reservas", icon: <IconCalendar /> },
  ];
}

function getDefaultPage(user: Usuario): PageId {
  if (user.tipo === "ADMIN") return "dashboard";
  if (user.tipo === "ANFITRIAO") return "meusImoveis";
  return "explorar";
}

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "Dashboard",
  imoveis: "Imóveis",
  anfitrioes: "Usuários",
  reservas: "Reservas",
  meusImoveis: "Meus Imóveis",
  minhasReservas: "Minhas Reservas",
  reservasRecebidas: "Reservas nos meus Imóveis",
  explorar: "Explorar Imóveis",
};

const Sidebar = ({
  current,
  onNavigate,
  collapsed,
  onToggle,
  items,
  user,
  onLogout,
}: {
  current: PageId;
  onNavigate: (p: PageId) => void;
  collapsed: boolean;
  onToggle: () => void;
  items: NavItem[];
  user: Usuario;
  onLogout: () => void;
}) => (
  <aside
    className={`fixed top-0 left-0 h-full z-30 bg-white border-r border-stone-100 flex flex-col shadow-sm transition-all duration-300 ${collapsed ? "w-[68px]" : "w-60"}`}
  >
    <div className="flex items-center gap-3 px-4 py-5 border-b border-stone-100">
      <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm bg-white">
        <img src={logoImg} alt="Hostly" className="w-full h-full object-cover" />
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
      {items.map((item) => {
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
        <button
          onClick={onLogout}
          className="w-9 h-9 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors"
        >
          <IconLogout />
        </button>
      ) : (
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.nome
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-stone-700 truncate">
              {user.nome}
            </p>
            <p className="text-xs text-stone-400">{user.tipo}</p>
          </div>
          <span className="text-stone-300 group-hover:text-stone-500 transition-colors">
            <IconLogout />
          </span>
        </button>
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
  const [user, setUser] = useState<Usuario | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState<PageId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const navItems = useMemo(() => (user ? getNav(user) : []), [user]);

  const bootstrapSession = async () => {
    if (!hasSessionToken()) {
      setUser(null);
      setCheckingSession(false);
      return;
    }

    try {
      const me = await authService.me();
      setUser(me);
      setPage(getDefaultPage(me));
    } catch {
      authService.logout();
      setUser(null);
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    void bootstrapSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    const available = getNav(user).map((item) => item.id);
    if (!available.includes(page)) {
      setPage(getDefaultPage(user));
    }
  }, [user, page]);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setPage("dashboard");
  };

  const sidebarWidth = collapsed ? 68 : 240;

  const renderPage = () => {
    if (!user) return null;

    switch (page) {
      case "dashboard":
        return <DashboardPage />;
      case "imoveis":
        return <ImoveisPage />;
      case "anfitrioes":
        return <AnfitrioesPage />;
      case "reservas":
        return <ReservasPage />;
      case "meusImoveis":
        return (
          <ImoveisPage
            ownerId={user.idUsuario}
            canManage
            title="Meus Imóveis"
          />
        );
      case "minhasReservas":
        return (
          <ReservasPage
            guestId={user.idUsuario}
            fixedGuestId={user.idUsuario}
            canManage
            title="Minhas Reservas"
          />
        );
      case "reservasRecebidas":
        return (
          <ReservasPage
            hostId={user.idUsuario}
            canManage={false}
            title="Reservas nos meus Imóveis"
          />
        );
      case "explorar":
        return <ImoveisPage canManage={false} title="Explorar Imóveis" />;
      default:
        return null;
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-100 to-stone-50 flex items-center justify-center text-stone-500">
        Carregando sessão...
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={bootstrapSession} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-stone-50">
      <Sidebar
        current={page}
        onNavigate={setPage}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        items={navItems}
        user={user}
        onLogout={handleLogout}
      />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <Header current={page} sidebarWidth={sidebarWidth} />
        <main className="pt-16 min-h-screen">
          <div className="max-w-6xl mx-auto px-6 py-6">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}
