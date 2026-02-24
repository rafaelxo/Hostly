import { Badge, ErrorMsg, Spinner } from "../components/common";
import { IconBuilding } from "../components/icons";
import {
  useAnfitrioes,
  useDashboard,
  useImoveis,
  useReservas,
} from "../hooks/useData";

export function DashboardPage() {
  const { data: stats, loading, error } = useDashboard();
  const { data: imoveis } = useImoveis();
  const { data: anfitrioes } = useAnfitrioes();
  const { data: reservas } = useReservas();

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
          value: stats.totalReservas,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-800 tracking-tight">
          Visão Geral
        </h1>
        <p className="text-stone-400 mt-1 text-sm">
          Resumo operacional do Hostly em tempo real.
        </p>
      </div>
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <section className="xl:col-span-8 space-y-4">
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((s) => (
                <div
                  key={s.label}
                  className={`bg-white rounded-2xl border border-stone-100 border-l-4 ${s.accent} p-4 shadow-sm`}
                >
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-3xl font-bold mt-1 text-stone-800">
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
                <span className="text-xs text-stone-400">
                  {imoveis.length} cadastrados
                </span>
              </div>
              <div className="divide-y divide-stone-50">
                {imoveis.slice(0, 5).map((item) => (
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
        </section>

        <aside className="xl:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
              Equipe ativa
            </h3>
            <div className="space-y-3">
              {(anfitrioes ?? []).slice(0, 4).map((a) => (
                <div
                  key={a.idUsuario}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      {a.nome}
                    </p>
                    <p className="text-xs text-stone-400">{a.email}</p>
                  </div>
                  <Badge active={a.ativo} />
                </div>
              ))}
              {(!anfitrioes || anfitrioes.length === 0) && (
                <p className="text-sm text-stone-400">
                  Nenhum anfitrião cadastrado.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
              Reservas recentes
            </h3>
            <div className="space-y-3">
              {(reservas ?? []).slice(0, 5).map((r) => (
                <div
                  key={r.idReserva}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-stone-700 truncate pr-3">
                    {r.nomeHospede}
                  </span>
                  <span className="font-semibold text-stone-700">
                    R$ {r.valorTotal.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
              {(!reservas || reservas.length === 0) && (
                <p className="text-sm text-stone-400">
                  Nenhuma reserva cadastrada.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
