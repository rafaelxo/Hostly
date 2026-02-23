import { Badge, ErrorMsg, Spinner } from "../components/common";
import { IconBuilding } from "../components/icons";
import { useDashboard, useImoveis } from "../hooks/useData";

export function DashboardPage() {
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
}
