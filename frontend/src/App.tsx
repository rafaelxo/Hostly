import { useEffect, useMemo, useState, type ReactNode } from "react";
import logoImg from "./assets/logo.png";
import {
  IconBell,
  IconBuilding,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconLogout,
  IconMoney,
  IconSearch,
  IconUsers,
} from "./components/icons";
import { AnfitrioesPage } from "./pages/AnfitrioesPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImoveisPage } from "./pages/ImoveisPage";
import { ImovelDetailPage } from "./pages/ImovelDetailPage";
import { ReceitaPage } from "./pages/ReceitaPage";
import { ReservasPage } from "./pages/ReservasPage";
import {
  authService,
  hasSessionToken,
  imoveisService,
  type Usuario,
} from "./services/api";

type PageId =
  | "dashboard"
  | "minhasReservas"
  | "meusImoveis"
  | "reservasRecebidas"
  | "receita"
  | "reservasAtivas"
  | "usuariosAtivos"
  | "imoveisAtivos";

type NavItem = { id: PageId; label: string; icon: ReactNode };

function getNav(user: Usuario): NavItem[] {
  if (user.tipo === "ADMIN") {
    return [
      { id: "dashboard", label: "Dashboard", icon: <IconHome /> },
      {
        id: "imoveisAtivos",
        label: "Imóveis Ativos",
        icon: <IconBuilding />,
      },
      {
        id: "reservasAtivas",
        label: "Reservas Ativas",
        icon: <IconCalendar />,
      },
      { id: "usuariosAtivos", label: "Usuários Ativos", icon: <IconUsers /> },
    ];
  }

  if (user.tipo === "ANFITRIAO") {
    return [
      { id: "dashboard", label: "Mapa de Imóveis", icon: <IconHome /> },
      {
        id: "minhasReservas",
        label: "Minhas Reservas",
        icon: <IconCalendar />,
      },
      { id: "meusImoveis", label: "Meus Imóveis", icon: <IconBuilding /> },
      {
        id: "reservasRecebidas",
        label: "Reservas dos Imóveis",
        icon: <IconCalendar />,
      },
      { id: "receita", label: "Receita", icon: <IconMoney /> },
    ];
  }

  return [
    { id: "dashboard", label: "Mapa de Imóveis", icon: <IconBuilding /> },
    { id: "minhasReservas", label: "Minhas Reservas", icon: <IconCalendar /> },
  ];
}

function getDefaultPage(user: Usuario): PageId {
  if (user.tipo === "ADMIN") return "dashboard";
  if (user.tipo === "ANFITRIAO") return "dashboard";
  return "dashboard";
}

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "Dashboard",
  minhasReservas: "Minhas Reservas",
  meusImoveis: "Meus Imóveis",
  reservasRecebidas: "Reservas dos Imóveis",
  receita: "Receita por Imóvel",
  reservasAtivas: "Reservas Ativas",
  usuariosAtivos: "Usuários Ativos",
  imoveisAtivos: "Imóveis Ativos",
};

type NovoImovelForm = {
  titulo: string;
  descricao: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  valorDiaria: string;
  comodidades: string;
  fotos: string;
};

const initialNovoImovelForm: NovoImovelForm = {
  titulo: "",
  descricao: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  valorDiaria: "",
  comodidades: "",
  fotos: "",
};

const inputCls =
  "w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 transition-all";

const isHttpURL = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const AddPropertyModal = ({
  open,
  onClose,
  form,
  onChange,
  onSubmit,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  form: NovoImovelForm;
  onChange: (field: keyof NovoImovelForm, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-stone-100 shadow-xl">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="text-lg font-semibold text-stone-800">
            Adicionar imóvel
          </h3>
          <p className="text-sm text-stone-400">
            Preencha os dados para publicar seu imóvel.
          </p>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input
                className={inputCls}
                placeholder="Título"
                value={form.titulo}
                onChange={(e) => onChange("titulo", e.target.value)}
                required
              />
            </div>
            <input
              className={inputCls}
              placeholder="Cidade"
              value={form.cidade}
              onChange={(e) => onChange("cidade", e.target.value)}
              required
            />
            <input
              className={inputCls}
              placeholder="Estado (UF)"
              value={form.estado}
              onChange={(e) => onChange("estado", e.target.value.toUpperCase())}
              required
            />
            <input
              className={inputCls}
              placeholder="Rua"
              value={form.rua}
              onChange={(e) => onChange("rua", e.target.value)}
              required
            />
            <input
              className={inputCls}
              placeholder="Número"
              value={form.numero}
              onChange={(e) => onChange("numero", e.target.value)}
              required
            />
            <input
              className={inputCls}
              placeholder="Bairro"
              value={form.bairro}
              onChange={(e) => onChange("bairro", e.target.value)}
              required
            />
            <input
              className={inputCls}
              placeholder="CEP"
              value={form.cep}
              onChange={(e) => onChange("cep", e.target.value)}
              required
            />
            <input
              className={inputCls}
              placeholder="Valor da diária"
              type="number"
              min="1"
              value={form.valorDiaria}
              onChange={(e) => onChange("valorDiaria", e.target.value)}
              required
            />
            <div className="md:col-span-2">
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Descrição"
                value={form.descricao}
                onChange={(e) => onChange("descricao", e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <input
                className={inputCls}
                placeholder="Fotos (URLs separadas por vírgula)"
                value={form.fotos}
                onChange={(e) => onChange("fotos", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <input
                className={inputCls}
                placeholder="Comodidades (separadas por vírgula)"
                value={form.comodidades}
                onChange={(e) => onChange("comodidades", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60"
            >
              {loading ? "Publicando..." : "Publicar imóvel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Sidebar = ({
  current,
  onNavigate,
  collapsed,
  onToggle,
  items,
  user,
  onLogout,
  onOpenAddProperty,
}: {
  current: PageId;
  onNavigate: (p: PageId) => void;
  collapsed: boolean;
  onToggle: () => void;
  items: NavItem[];
  user: Usuario;
  onLogout: () => void;
  onOpenAddProperty: () => void;
}) => (
  <aside
    className={`fixed top-0 left-0 h-full z-30 bg-white border-r border-stone-100 flex flex-col shadow-sm transition-all duration-300 ${collapsed ? "w-[68px]" : "w-60"}`}
  >
    <div className="flex items-center gap-3 px-4 py-5 border-b border-stone-100">
      <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm bg-white">
        <img
          src={logoImg}
          alt="Hostly"
          className="w-full h-full object-cover"
        />
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
      {!collapsed && user.tipo === "HOSPEDE" && (
        <button
          onClick={onOpenAddProperty}
          className="w-full mb-2 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
        >
          Seja anfitrião
        </button>
      )}

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
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [addPropertyLoading, setAddPropertyLoading] = useState(false);
  const [addPropertyError, setAddPropertyError] = useState<string | null>(null);
  const [novoImovelForm, setNovoImovelForm] = useState<NovoImovelForm>(
    initialNovoImovelForm,
  );
  const [viewingImovelId, setViewingImovelId] = useState<number | null>(null);
  const [preselectedReservaImovelId, setPreselectedReservaImovelId] = useState<
    number | null
  >(null);

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
    setViewingImovelId(null);
    setPage("dashboard");
  };

  const handleNavigate = (nextPage: PageId) => {
    setViewingImovelId(null);
    setPreselectedReservaImovelId(null);
    setPage(nextPage);
  };

  const handleStartReserva = (imovelId: number) => {
    setViewingImovelId(null);
    setPreselectedReservaImovelId(imovelId);
    setPage("minhasReservas");
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const photos = novoImovelForm.fotos
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (novoImovelForm.titulo.trim().length < 4) {
      setAddPropertyError("O título precisa ter pelo menos 4 caracteres.");
      return;
    }

    if (photos.length === 0) {
      setAddPropertyError("Informe pelo menos 1 URL de foto (http/https).");
      return;
    }

    if (photos.some((photo) => !isHttpURL(photo))) {
      setAddPropertyError(
        "Todas as fotos precisam ser URLs válidas com http/https.",
      );
      return;
    }

    setAddPropertyLoading(true);
    setAddPropertyError(null);
    try {
      await imoveisService.create({
        idUsuario: user.idUsuario,
        titulo: novoImovelForm.titulo,
        descricao: novoImovelForm.descricao,
        endereco: {
          rua: novoImovelForm.rua,
          numero: novoImovelForm.numero,
          bairro: novoImovelForm.bairro,
          cidade: novoImovelForm.cidade,
          estado: novoImovelForm.estado,
          cep: novoImovelForm.cep,
        },
        comodidades: novoImovelForm.comodidades
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((nome) => ({ nome })),
        cidade: novoImovelForm.cidade,
        valorDiaria: Number(novoImovelForm.valorDiaria),
        dataCadastro: new Date().toISOString().slice(0, 10),
        fotos: photos,
        ativo: true,
      });

      setShowAddPropertyModal(false);
      setNovoImovelForm(initialNovoImovelForm);

      try {
        const me = await authService.me();
        setUser(me);
        if (me.tipo === "ANFITRIAO") {
          setPage("meusImoveis");
        }
      } catch {
        //
      }
    } catch (e) {
      setAddPropertyError(
        e instanceof Error ? e.message : "Não foi possível cadastrar o imóvel.",
      );
    } finally {
      setAddPropertyLoading(false);
    }
  };

  const sidebarWidth = collapsed ? 68 : 240;

  const renderPage = () => {
    if (!user) return null;

    if (viewingImovelId !== null) {
      return (
        <ImovelDetailPage
          imovelId={viewingImovelId}
          onBack={() => setViewingImovelId(null)}
          canManage={user.tipo === "ANFITRIAO" || user.tipo === "ADMIN"}
        />
      );
    }

    switch (page) {
      case "dashboard":
        return (
          <DashboardPage
            onViewDetail={(id) => setViewingImovelId(id)}
            onBook={
              user.tipo === "HOSPEDE" || user.tipo === "ANFITRIAO"
                ? handleStartReserva
                : undefined
            }
          />
        );
      case "minhasReservas":
        return (
          <ReservasPage
            guestId={user.idUsuario}
            fixedGuestId={user.idUsuario}
            preselectedImovelId={preselectedReservaImovelId ?? undefined}
            canManage={user.tipo !== "ADMIN"}
            title="Minhas Reservas"
          />
        );
      case "meusImoveis":
        return (
          <ImoveisPage
            ownerId={user.idUsuario}
            canManage={user.tipo === "ANFITRIAO"}
            title="Meus Imóveis"
            onViewDetail={(id) => setViewingImovelId(id)}
          />
        );
      case "reservasRecebidas":
        return (
          <ReservasPage
            hostId={user.idUsuario}
            canManage={false}
            title="Reservas dos meus imóveis"
          />
        );
      case "receita":
        return <ReceitaPage hostId={user.idUsuario} />;
      case "reservasAtivas":
        return (
          <ReservasPage activeOnly canManage={false} title="Reservas Ativas" />
        );
      case "usuariosAtivos":
        return (
          <AnfitrioesPage
            onlyActive
            canManage={false}
            title="Usuários Ativos"
          />
        );
      case "imoveisAtivos":
        return (
          <ImoveisPage
            onlyActive
            canManage={false}
            title="Imóveis Ativos"
            onViewDetail={(id) => setViewingImovelId(id)}
          />
        );
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
        onNavigate={handleNavigate}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        items={navItems}
        user={user}
        onLogout={handleLogout}
        onOpenAddProperty={() => {
          setAddPropertyError(null);
          setShowAddPropertyModal(true);
        }}
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

      <AddPropertyModal
        open={showAddPropertyModal}
        onClose={() => {
          setShowAddPropertyModal(false);
          setAddPropertyError(null);
        }}
        form={novoImovelForm}
        onChange={(field, value) => {
          setNovoImovelForm((prev) => ({ ...prev, [field]: value }));
        }}
        onSubmit={handleCreateProperty}
        loading={addPropertyLoading}
        error={addPropertyError}
      />
    </div>
  );
}
