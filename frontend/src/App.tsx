import { useEffect, useMemo, useState, type ReactNode } from "react";
import logoImg from "./assets/logo.png";
import {
  IconBuilding,
  IconCalendar,
  IconChat,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconLogout,
  IconMoney,
  IconUsers,
} from "./components/icons";
import { COMMON_AMENITIES } from "./constants/amenities";
import { AnfitrioesPage } from "./pages/AnfitrioesPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ChatPage } from "./pages/ChatPage";
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
import { geocodeAddressInput } from "./services/geocoding";

type PageId =
  | "dashboard"
  | "chat"
  | "minhasReservas"
  | "meusImoveis"
  | "reservasRecebidas"
  | "receita"
  | "reservasAtivas"
  | "usuariosAtivos"
  | "imoveisAtivos";

type NavItem = { id: PageId; label: string; icon: ReactNode };

const LAYOUT_GAP = 16;
const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 80;
const CONTENT_OUTER_GUTTER = 24;

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
      { id: "chat", label: "Chat", icon: <IconChat /> },
      { id: "receita", label: "Receita", icon: <IconMoney /> },
    ];
  }

  return [
    { id: "dashboard", label: "Mapa de Imóveis", icon: <IconBuilding /> },
    { id: "minhasReservas", label: "Minhas Reservas", icon: <IconCalendar /> },
    { id: "chat", label: "Chat", icon: <IconChat /> },
  ];
}

function getDefaultPage(user: Usuario): PageId {
  if (user.tipo === "ADMIN") return "dashboard";
  if (user.tipo === "ANFITRIAO") return "dashboard";
  return "dashboard";
}

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "Dashboard",
  chat: "Chat",
  minhasReservas: "Minhas Reservas",
  meusImoveis: "Meus Imóveis",
  reservasRecebidas: "Reservas dos Imóveis",
  receita: "Receita por Imóvel",
  reservasAtivas: "Reservas Ativas",
  usuariosAtivos: "Usuários Ativos",
  imoveisAtivos: "Imóveis Ativos",
};

const PAGE_SUBTITLES: Record<PageId, string> = {
  dashboard: "Visão consolidada da operação em tempo real",
  chat: "Converse com hóspedes e anfitriões para tirar dúvidas",
  minhasReservas: "Acompanhe, edite e confirme suas reservas",
  meusImoveis: "Gerencie seu portfólio com filtros e ordenação",
  reservasRecebidas: "Reservas recebidas nos seus imóveis",
  receita: "Evolução de receita por imóvel e período",
  reservasAtivas: "Reservas atualmente em vigência",
  usuariosAtivos: "Usuários com conta ativa na plataforma",
  imoveisAtivos: "Imóveis publicados e disponíveis",
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
  comodidades: string[];
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
  comodidades: [],
};

const inputCls =
  "w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 transition-all";

const AddPropertyModal = ({
  open,
  onClose,
  form,
  onChange,
  onToggleAmenity,
  onFilesChange,
  onSubmit,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  form: NovoImovelForm;
  onChange: (
    field: Exclude<keyof NovoImovelForm, "comodidades">,
    value: string,
  ) => void;
  onToggleAmenity: (amenity: string) => void;
  onFilesChange: (files: FileList | null) => void;
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
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                onChange={(e) => onFilesChange(e.target.files)}
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                {COMMON_AMENITIES.map((amenity) => {
                  const selected = form.comodidades.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => onToggleAmenity(amenity)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        selected
                          ? "bg-amber-100 border-amber-300 text-amber-700"
                          : "bg-white border-stone-200 text-stone-600 hover:border-amber-300"
                      }`}
                    >
                      {amenity}
                    </button>
                  );
                })}
              </div>
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
    className={`app-sidebar fixed top-4 left-4 h-[calc(100%-32px)] z-30 flex flex-col transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}
  >
    <button
      onClick={onToggle}
      className="absolute -right-3 top-6 w-6 h-10 rounded-xl bg-white border border-[var(--hostly-border)] shadow-sm text-stone-500 hover:text-stone-800 transition-colors flex items-center justify-center z-10"
      aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
    >
      {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
    </button>

    <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--hostly-border)]/80">
      <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm bg-white border border-[var(--hostly-border)]">
        <img
          src={logoImg}
          alt="Hostly"
          className="w-full h-full object-cover"
        />
      </div>
      {!collapsed && (
        <span className="text-[var(--hostly-text)] font-extrabold text-lg tracking-tight">
          Hostly
        </span>
      )}
    </div>
    <nav className="flex-1 py-5 px-2.5 space-y-1.5">
      {items.map((item) => {
        const active = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${active ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-200/60" : "text-stone-600 hover:text-stone-900 hover:bg-white"}
              ${collapsed ? "justify-center" : ""}`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </nav>
    <div
      className={`px-2 pb-4 pt-3 border-t border-[var(--hostly-border)]/80 ${collapsed ? "flex justify-center" : ""}`}
    >
      {!collapsed && user.tipo === "HOSPEDE" && (
        <button
          onClick={onOpenAddProperty}
          className="w-full mb-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold"
        >
          Seja anfitrião
        </button>
      )}

      {collapsed ? (
        <button
          onClick={onLogout}
          className="w-9 h-9 rounded-xl bg-white border border-[var(--hostly-border)] flex items-center justify-center text-stone-500 hover:text-stone-700 transition-colors"
        >
          <IconLogout />
        </button>
      ) : (
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
            {user.nome
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--hostly-text)] truncate">
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
  title,
  subtitle,
  contentLeft,
}: {
  title: string;
  subtitle?: string;
  contentLeft: number;
}) => (
  <header
    className="app-header fixed top-4 z-20 h-16 rounded-2xl flex items-center gap-4 px-6 transition-all duration-300"
    style={{
      left: contentLeft + CONTENT_OUTER_GUTTER,
      right: LAYOUT_GAP + CONTENT_OUTER_GUTTER,
    }}
  >
    <div className="flex-1 min-w-0">
      <h2 className="font-bold text-[var(--hostly-text)] tracking-tight truncate">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-[var(--hostly-muted)] mt-0.5 truncate">
          {subtitle}
        </p>
      )}
    </div>
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
  const [novoImovelFiles, setNovoImovelFiles] = useState<File[]>([]);
  const [novoImovelForm, setNovoImovelForm] = useState<NovoImovelForm>(
    initialNovoImovelForm,
  );
  const [viewingImovelId, setViewingImovelId] = useState<number | null>(null);
  const [preselectedReservaImovelId, setPreselectedReservaImovelId] = useState<
    number | null
  >(null);
  const [chatTargetUserId, setChatTargetUserId] = useState<number | null>(null);
  const [chatTargetPropertyId, setChatTargetPropertyId] = useState<number | null>(
    null,
  );

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
    if (nextPage !== "chat") {
      setChatTargetUserId(null);
      setChatTargetPropertyId(null);
    }
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartReserva = (imovelId: number) => {
    setViewingImovelId(null);
    setPreselectedReservaImovelId(imovelId);
    setPage("minhasReservas");
  };

  const handleStartChatFromProperty = (hostId: number, propertyId: number) => {
    setViewingImovelId(null);
    setChatTargetUserId(hostId);
    setChatTargetPropertyId(propertyId);
    setPage("chat");
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (novoImovelForm.titulo.trim().length < 4) {
      setAddPropertyError("O título precisa ter pelo menos 4 caracteres.");
      return;
    }

    if (novoImovelFiles.length === 0) {
      setAddPropertyError("Anexe pelo menos uma foto do imóvel.");
      return;
    }

    setAddPropertyLoading(true);
    setAddPropertyError(null);
    try {
      const coords = await geocodeAddressInput(
        {
          rua: novoImovelForm.rua,
          numero: novoImovelForm.numero,
          bairro: novoImovelForm.bairro,
          cidade: novoImovelForm.cidade,
          estado: novoImovelForm.estado,
          cep: novoImovelForm.cep,
        },
        novoImovelForm.cidade,
      );

      await imoveisService.createWithFiles(
        {
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
            .map((item) => item.trim())
            .filter(Boolean)
            .map((nome) => ({ nome })),
          cidade: novoImovelForm.cidade,
          latitude: coords?.[0] ?? 0,
          longitude: coords?.[1] ?? 0,
          valorDiaria: Number(novoImovelForm.valorDiaria),
          dataCadastro: new Date().toISOString().slice(0, 10),
          ativo: true,
        },
        novoImovelFiles,
      );

      setShowAddPropertyModal(false);
      setNovoImovelForm(initialNovoImovelForm);
      setNovoImovelFiles([]);

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

  const sidebarWidth = collapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;
  const contentLeft = sidebarWidth + LAYOUT_GAP * 2;
  const headerTitle =
    viewingImovelId !== null ? "Detalhes do Imóvel" : PAGE_TITLES[page];
  const headerSubtitle =
    viewingImovelId !== null
      ? "Visualização completa do imóvel selecionado"
      : PAGE_SUBTITLES[page];

  const renderPage = () => {
    if (!user) return null;

    if (viewingImovelId !== null) {
      return (
        <ImovelDetailPage
          imovelId={viewingImovelId}
          onBack={() => setViewingImovelId(null)}
          canManage={user.tipo === "ANFITRIAO" || user.tipo === "ADMIN"}
          onStartChat={
            user.tipo === "HOSPEDE"
              ? (hostId, propertyId) => handleStartChatFromProperty(hostId, propertyId)
              : undefined
          }
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
      case "chat":
        return (
          <ChatPage
            currentUser={user}
            preselectedUserId={chatTargetUserId ?? undefined}
            preselectedPropertyId={chatTargetPropertyId ?? undefined}
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
      <div className="min-h-screen app-shell flex items-center justify-center text-stone-500">
        Carregando sessão...
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={bootstrapSession} />;
  }

  return (
    <div className="app-shell">
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
        style={{ marginLeft: contentLeft }}
      >
        <Header
          title={headerTitle}
          subtitle={headerSubtitle}
          contentLeft={contentLeft}
        />
        <main className="pt-24 min-h-screen pb-6">
          <div className="w-full px-6">
            <div className="app-main-surface">{renderPage()}</div>
          </div>
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
        onToggleAmenity={(amenity) => {
          setNovoImovelForm((prev) => ({
            ...prev,
            comodidades: prev.comodidades.includes(amenity)
              ? prev.comodidades.filter((c) => c !== amenity)
              : [...prev.comodidades, amenity],
          }));
        }}
        onFilesChange={(files) => {
          setNovoImovelFiles(Array.from(files ?? []));
        }}
        onSubmit={handleCreateProperty}
        loading={addPropertyLoading}
        error={addPropertyError}
      />
    </div>
  );
}
