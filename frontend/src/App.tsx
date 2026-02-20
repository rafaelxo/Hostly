import { useState } from "react";
import {
  useImoveis,
  useAnfitrioes,
  useReservas,
  useDashboard,
} from "./hooks/useData";
import type { Imovel, Anfitriao, Reserva } from "./services/api";

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
const IconArrowLeft = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M19 12H5M12 5l-7 7 7 7" />
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
const IconCheck = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

type PageId = "dashboard" | "imoveis" | "anfitrioes" | "reservas";
type SubView = "list" | "new" | "edit";

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

const inputCls =
  "w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 transition-all";

const Field = ({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-stone-700">
      {label} {required && <span className="text-amber-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-stone-400">{hint}</p>}
  </div>
);

const FormHeader = ({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) => (
  <div className="flex items-start gap-4 mb-8">
    <button
      onClick={onBack}
      className="mt-1 p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 transition-colors"
    >
      <IconArrowLeft />
    </button>
    <div>
      <h1 className="text-xl font-semibold text-stone-800">{title}</h1>
      <p className="text-sm text-stone-400 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

const FormCard = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
    {title && (
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-5">
        {title}
      </h3>
    )}
    {children}
  </div>
);

const FormNovoImovel = ({ onBack }: { onBack: () => void }) => {
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    cidade: "",
    valorDiaria: "",
    fotos: "",
    ativo: true,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onBack();
    }, 1200);
  };

  return (
    <div>
      <FormHeader
        title="Novo Imóvel"
        subtitle="Preencha os dados para cadastrar um novo imóvel"
        onBack={onBack}
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormCard title="Informações Básicas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Título do anúncio" required>
                <input
                  className={inputCls}
                  placeholder="Ex: Apartamento aconchegante no Savassi"
                  value={form.titulo}
                  onChange={(e) => set("titulo", e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Cidade" required>
              <input
                className={inputCls}
                placeholder="Ex: Belo Horizonte"
                value={form.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                required
              />
            </Field>
            <Field label="Valor da diária (R$)" required>
              <input
                className={inputCls}
                type="number"
                min="0"
                placeholder="Ex: 350"
                value={form.valorDiaria}
                onChange={(e) => set("valorDiaria", e.target.value)}
                required
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Descrição">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="Descreva o imóvel, comodidades, localização..."
                  value={form.descricao}
                  onChange={(e) => set("descricao", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </FormCard>
        <FormCard title="Fotos">
          <Field
            label="URLs das fotos"
            hint="Separe múltiplas URLs por vírgula"
          >
            <input
              className={inputCls}
              placeholder="https://exemplo.com/foto1.jpg, https://exemplo.com/foto2.jpg"
              value={form.fotos}
              onChange={(e) => set("fotos", e.target.value)}
            />
          </Field>
        </FormCard>
        <FormCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">Imóvel ativo</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Imóveis ativos aparecem nas listagens públicas
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("ativo", !form.ativo)}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.ativo ? "bg-amber-500" : "bg-stone-200"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.ativo ? "left-5" : "left-0.5"}`}
              />
            </button>
          </div>
        </FormCard>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || success}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 transition-colors shadow-sm"
          >
            {success ? (
              <>
                <IconCheck /> Cadastrado!
              </>
            ) : loading ? (
              "Salvando..."
            ) : (
              <>
                <IconPlus /> Cadastrar Imóvel
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const FormNovoAnfitriao = ({ onBack }: { onBack: () => void }) => {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    ativo: true,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onBack();
    }, 1200);
  };

  return (
    <div>
      <FormHeader
        title="Novo Anfitrião"
        subtitle="Cadastre um novo anfitrião responsável por imóveis"
        onBack={onBack}
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormCard title="Dados Pessoais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Nome completo" required>
                <input
                  className={inputCls}
                  placeholder="Ex: João da Silva"
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="E-mail" required>
              <input
                className={inputCls}
                type="email"
                placeholder="joao@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </Field>
            <Field label="Senha" required hint="Mínimo 6 caracteres">
              <input
                className={inputCls}
                type="password"
                placeholder="••••••••"
                value={form.senha}
                onChange={(e) => set("senha", e.target.value)}
                required
                minLength={6}
              />
            </Field>
          </div>
        </FormCard>
        <FormCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">Conta ativa</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Anfitriões ativos podem gerenciar imóveis
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("ativo", !form.ativo)}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.ativo ? "bg-amber-500" : "bg-stone-200"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.ativo ? "left-5" : "left-0.5"}`}
              />
            </button>
          </div>
        </FormCard>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || success}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 transition-colors shadow-sm"
          >
            {success ? (
              <>
                <IconCheck /> Cadastrado!
              </>
            ) : loading ? (
              "Salvando..."
            ) : (
              <>
                <IconPlus /> Cadastrar Anfitrião
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const FormNovaReserva = ({
  onBack,
  imoveis,
}: {
  onBack: () => void;
  imoveis: Imovel[];
}) => {
  const [form, setForm] = useState({
    idImovel: "",
    nomeHospede: "",
    dataInicio: "",
    dataFim: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const imovelSelecionado = imoveis.find(
    (i) => i.idImovel === Number(form.idImovel),
  );
  const noites =
    form.dataInicio && form.dataFim
      ? Math.max(
          0,
          Math.ceil(
            (new Date(form.dataFim).getTime() -
              new Date(form.dataInicio).getTime()) /
              86400000,
          ),
        )
      : 0;
  const total = imovelSelecionado ? noites * imovelSelecionado.valorDiaria : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onBack();
    }, 1200);
  };

  return (
    <div>
      <FormHeader
        title="Nova Reserva"
        subtitle="Registre uma nova reserva para um imóvel"
        onBack={onBack}
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormCard title="Imóvel e Hóspede">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Imóvel" required>
                <select
                  className={inputCls}
                  value={form.idImovel}
                  onChange={(e) => set("idImovel", e.target.value)}
                  required
                >
                  <option value="">Selecione um imóvel...</option>
                  {imoveis
                    .filter((i) => i.ativo)
                    .map((i) => (
                      <option key={i.idImovel} value={i.idImovel}>
                        {i.titulo} — {i.cidade}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Nome do hóspede" required>
                <input
                  className={inputCls}
                  placeholder="Ex: Maria Souza"
                  value={form.nomeHospede}
                  onChange={(e) => set("nomeHospede", e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>
        </FormCard>
        <FormCard title="Período">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Data de entrada" required>
              <input
                className={inputCls}
                type="date"
                value={form.dataInicio}
                onChange={(e) => set("dataInicio", e.target.value)}
                required
              />
            </Field>
            <Field label="Data de saída" required>
              <input
                className={inputCls}
                type="date"
                value={form.dataFim}
                onChange={(e) => set("dataFim", e.target.value)}
                required
              />
            </Field>
          </div>
        </FormCard>
        {imovelSelecionado && noites > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
              Resumo da reserva
            </p>
            <div className="flex items-center justify-between text-sm text-stone-600 mb-1">
              <span>
                R$ {imovelSelecionado.valorDiaria.toLocaleString("pt-BR")} ×{" "}
                {noites} noite{noites > 1 ? "s" : ""}
              </span>
              <span>R$ {total.toLocaleString("pt-BR")}</span>
            </div>
            <div className="border-t border-amber-200 mt-3 pt-3 flex items-center justify-between font-semibold text-stone-800">
              <span>Total</span>
              <span className="text-amber-600 text-lg">
                R$ {total.toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || success}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 transition-colors shadow-sm"
          >
            {success ? (
              <>
                <IconCheck /> Reservado!
              </>
            ) : loading ? (
              "Salvando..."
            ) : (
              <>
                <IconPlus /> Registrar Reserva
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const PageDashboard = () => {
  const { data: stats, loading, error } = useDashboard();
  const { data: imoveis } = useImoveis();

  const statCards = stats
    ? [
        {
          label: "Imóveis Ativos",
          value: stats.totalImoveis,
          sub: "cadastrados",
          accent: "border-l-amber-400",
        },
        {
          label: "Anfitriões",
          value: stats.totalAnfitrioes,
          sub: "ativos",
          accent: "border-l-teal-400",
        },
        {
          label: "Reservas Ativas",
          value: stats.reservasAtivas,
          sub: "em andamento",
          accent: "border-l-sky-400",
        },
        {
          label: "Receita Total",
          value: `R$ ${stats.receitaTotal.toLocaleString("pt-BR")}`,
          sub: "acumulada",
          accent: "border-l-violet-400",
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
              className={`bg-white rounded-2xl border border-stone-100 border-l-4 ${s.accent} p-5 shadow-sm`}
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

const PageImoveis = ({ onNew }: { onNew: () => void }) => {
  const { data: imoveis, loading, error } = useImoveis();
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
          <span className="text-stone-400">
            <IconSearch />
          </span>
          <input
            className="flex-1 text-sm text-stone-600 placeholder-stone-400 outline-none"
            placeholder="Buscar por título ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm whitespace-nowrap"
        >
          <IconPlus /> Novo Imóvel
        </button>
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
            Cadastre um novo imóvel para começar.
          </p>
          <button
            onClick={onNew}
            className="mt-5 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <IconPlus /> Novo Imóvel
          </button>
        </div>
      )}
    </div>
  );
};

const PageAnfitrioes = ({ onNew }: { onNew: () => void }) => {
  const { data: anfitrioes, loading, error } = useAnfitrioes();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <IconPlus /> Novo Anfitrião
        </button>
      </div>
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

const PageReservas = ({ onNew }: { onNew: () => void }) => {
  const { data: reservas, loading, error } = useReservas();
  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <IconPlus /> Nova Reserva
        </button>
      </div>
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

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "Dashboard",
  imoveis: "Imóveis",
  anfitrioes: "Anfitriões",
  reservas: "Reservas",
};

const Header = ({
  current,
  subView,
  sidebarWidth,
}: {
  current: PageId;
  subView: SubView;
  sidebarWidth: number;
}) => (
  <header
    className="fixed top-0 right-0 z-20 h-16 bg-white border-b border-stone-100 flex items-center gap-4 px-6 transition-all duration-300"
    style={{ left: sidebarWidth }}
  >
    <div className="flex-1 flex items-center gap-2">
      <h2 className="font-semibold text-stone-800">{PAGE_TITLES[current]}</h2>
      {subView !== "list" && (
        <>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-400">
            {subView === "new" ? "Novo" : "Editar"}
          </span>
        </>
      )}
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
  const [subView, setSubView] = useState<SubView>("list");
  const [collapsed, setCollapsed] = useState(false);
  const { data: imoveis } = useImoveis();

  const sidebarWidth = collapsed ? 68 : 240;
  const goTo = (p: PageId) => {
    setPage(p);
    setSubView("list");
  };
  const goNew = () => setSubView("new");
  const goBack = () => setSubView("list");

  const renderPage = () => {
    if (subView === "new") {
      if (page === "imoveis") return <FormNovoImovel onBack={goBack} />;
      if (page === "anfitrioes") return <FormNovoAnfitriao onBack={goBack} />;
      if (page === "reservas")
        return <FormNovaReserva onBack={goBack} imoveis={imoveis ?? []} />;
    }
    switch (page) {
      case "dashboard":
        return <PageDashboard />;
      case "imoveis":
        return <PageImoveis onNew={goNew} />;
      case "anfitrioes":
        return <PageAnfitrioes onNew={goNew} />;
      case "reservas":
        return <PageReservas onNew={goNew} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Sidebar
        current={page}
        onNavigate={goTo}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <Header current={page} subView={subView} sidebarWidth={sidebarWidth} />
        <main className="pt-16 min-h-screen">
          <div className="max-w-5xl mx-auto px-6 py-8">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}
