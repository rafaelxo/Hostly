import { useState } from "react";
import {
  useImoveis,
  useAnfitrioes,
  useReservas,
  useDashboard,
} from "./hooks/useData";
import type { Imovel, Anfitriao, Reserva } from "./services/api";

// ── Icons ────────────────────────────────────────────────────────────────────
const IconHome = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path
      d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
      strokeLinejoin="round"
    />
    <path d="M9 21V12h6v9" strokeLinejoin="round" />
  </svg>
);
const IconBuilding = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M9 3v18M15 3v18M3 9h18M3 15h18" />
  </svg>
);
const IconUsers = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconCalendar = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconClose = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconChevronRight = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const IconChevronLeft = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const IconPlus = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconSearch = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
const IconBell = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);
const IconLogout = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);
const IconEdit = () => (
  <svg
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconTrash = () => (
  <svg
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
type PageId = "dashboard" | "imoveis" | "anfitrioes" | "reservas";

// ── Shared UI ─────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
  </div>
);

const ErrorMsg = ({ msg }: { msg: string }) => (
  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-5 py-4 text-sm">
    {msg}
  </div>
);

const Badge = ({ active }: { active: boolean }) => (
  <span
    className={`text-xs px-2.5 py-1 rounded-full font-medium ${active ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-400"}`}
  >
    {active ? "Ativo" : "Inativo"}
  </span>
);

// ── Dashboard Page ────────────────────────────────────────────────────────────
const PageDashboard = () => {
  const { data: stats, loading, error } = useDashboard();
  const { data: imoveis } = useImoveis();

  const statCards = stats
    ? [
        {
          label: "Imóveis Ativos",
          value: stats.totalImoveis,
          sub: "cadastrados",
          border: "border-l-amber-400",
        },
        {
          label: "Anfitriões",
          value: stats.totalAnfitrioes,
          sub: "ativos",
          border: "border-l-teal-400",
        },
        {
          label: "Reservas Ativas",
          value: stats.reservasAtivas,
          sub: "em andamento",
          border: "border-l-sky-400",
        },
        {
          label: "Receita Total",
          value: `R$ ${stats.receitaTotal.toLocaleString("pt-BR")}`,
          sub: "acumulada",
          border: "border-l-violet-400",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-800 tracking-tight">
          Visão Geral
        </h1>
        <p className="text-stone-400 mt-1 text-sm">
          Bem-vindo de volta, Rafael.
        </p>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div
              key={s.label}
              className={`bg-white rounded-2xl border border-stone-100 border-l-4 ${s.border} p-5 shadow-sm`}
            >
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                {s.label}
              </p>
              <p className="text-3xl font-bold mt-2 text-stone-800">
                {s.value}
              </p>
              <p className="text-xs text-stone-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {imoveis && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50">
            <span className="font-semibold text-stone-700 text-sm">
              Imóveis Recentes
            </span>
            <button className="text-xs text-amber-500 hover:text-amber-600 font-medium">
              Ver todos →
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {imoveis.slice(0, 4).map((item) => (
              <div
                key={item.idImovel}
                className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                    <IconBuilding />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      {item.titulo}
                    </p>
                    <p className="text-xs text-stone-400">{item.cidade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-stone-700">
                    R$ {item.valorDiaria.toLocaleString("pt-BR")}
                    <span className="text-xs font-normal text-stone-400">
                      /noite
                    </span>
                  </span>
                  <Badge active={item.ativo} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Imóveis Page ──────────────────────────────────────────────────────────────
const PageImoveis = () => {
  const { data: imoveis, loading, error, refetch } = useImoveis();
  const [search, setSearch] = useState("");

  const filtered =
    imoveis?.filter(
      (i) =>
        i.titulo.toLowerCase().includes(search.toLowerCase()) ||
        i.cidade.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-2.5 shadow-sm">
          <IconSearch />
          <input
            className="flex-1 text-sm text-stone-600 placeholder-stone-400 outline-none"
            placeholder="Buscar por título ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}

      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-6 py-3">
                  Imóvel
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Cidade
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Diária
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map((item: Imovel) => (
                <tr
                  key={item.idImovel}
                  className="hover:bg-stone-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                        <IconBuilding />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-800">
                          {item.titulo}
                        </p>
                        <p className="text-xs text-stone-400">
                          #{item.idImovel}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-600">
                    {item.cidade}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-stone-700">
                    R$ {item.valorDiaria.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-4">
                    <Badge active={item.ativo} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button className="p-1.5 rounded-lg text-stone-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                        <IconEdit />
                      </button>
                      <button className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-300 mb-4">
            <IconBuilding />
          </div>
          <p className="text-stone-500 font-medium">Nenhum imóvel encontrado</p>
          <p className="text-stone-400 text-sm mt-1">
            Tente outro termo ou cadastre um novo imóvel.
          </p>
        </div>
      )}
    </div>
  );
};

// ── Anfitriões Page ───────────────────────────────────────────────────────────
const PageAnfitrioes = () => {
  const { data: anfitrioes, loading, error } = useAnfitrioes();

  return (
    <div className="space-y-6">
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {anfitrioes && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {anfitrioes.map((a: Anfitriao) => (
            <div
              key={a.idUsuario}
              className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
                  {a.nome
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <Badge active={a.ativo} />
              </div>
              <p className="font-semibold text-stone-800">{a.nome}</p>
              <p className="text-sm text-stone-400 mt-0.5">{a.email}</p>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-stone-50">
                <button className="flex-1 text-xs font-medium text-stone-500 hover:text-amber-600 py-1.5 rounded-lg hover:bg-amber-50 transition-colors flex items-center justify-center gap-1">
                  <IconEdit /> Editar
                </button>
                <button className="flex-1 text-xs font-medium text-stone-500 hover:text-red-500 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1">
                  <IconTrash /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Reservas Page ─────────────────────────────────────────────────────────────
const PageReservas = () => {
  const { data: reservas, loading, error } = useReservas();

  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-6">
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {reservas && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-6 py-3">
                  Hóspede
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Imóvel
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Período
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {reservas.map((r: Reserva) => (
                <tr
                  key={r.idReserva}
                  className="hover:bg-stone-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 font-semibold text-xs">
                        {r.nomeHospede
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <p className="text-sm font-medium text-stone-800">
                        {r.nomeHospede}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-500">
                    Imóvel #{r.idImovel}
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-500">
                    {fmt(r.dataInicio)} → {fmt(r.dataFim)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-stone-700">
                    R$ {r.valorTotal.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard" as PageId, label: "Dashboard", icon: <IconHome /> },
  { id: "imoveis" as PageId, label: "Imóveis", icon: <IconBuilding /> },
  { id: "anfitrioes" as PageId, label: "Anfitriões", icon: <IconUsers /> },
  { id: "reservas" as PageId, label: "Reservas", icon: <IconCalendar /> },
];

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
    {/* Logo */}
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

    {/* Nav */}
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
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </nav>

    {/* User */}
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

// ── Header ────────────────────────────────────────────────────────────────────
const PAGE_META: Record<PageId, { title: string; cta: string }> = {
  dashboard: { title: "Dashboard", cta: "" },
  imoveis: { title: "Imóveis", cta: "Novo Imóvel" },
  anfitrioes: { title: "Anfitriões", cta: "Novo Anfitrião" },
  reservas: { title: "Reservas", cta: "Nova Reserva" },
};

const Header = ({
  current,
  sidebarWidth,
}: {
  current: PageId;
  sidebarWidth: number;
}) => {
  const meta = PAGE_META[current];
  return (
    <header
      className="fixed top-0 right-0 z-20 h-16 bg-white border-b border-stone-100 flex items-center gap-4 px-6 transition-all duration-300"
      style={{ left: sidebarWidth }}
    >
      <div className="flex-1">
        <h2 className="font-semibold text-stone-800">{meta.title}</h2>
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
      {meta.cta && (
        <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
          <IconPlus /> {meta.cta}
        </button>
      )}
    </header>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 68 : 240;

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <PageDashboard />;
      case "imoveis":
        return <PageImoveis />;
      case "anfitrioes":
        return <PageAnfitrioes />;
      case "reservas":
        return <PageReservas />;
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
