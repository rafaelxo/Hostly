import { useEffect, useMemo, useState } from "react";
import { ErrorMsg, Spinner } from "../components/common";
import {
  imoveisService,
  reservaService,
  type Imovel,
  type Reserva,
} from "../services/api";

const toLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function RegionMap({
  imoveis,
  reservas,
}: {
  imoveis: Imovel[];
  reservas: Reserva[];
}) {
  const cidades = useMemo(
    () => Array.from(new Set(imoveis.map((item) => item.cidade))).sort(),
    [imoveis],
  );

  const [cidadeSelecionada, setCidadeSelecionada] = useState("");
  const [dataInicio, setDataInicio] = useState(() => {
    const today = new Date();
    return toIsoDate(today);
  });
  const [dataFim, setDataFim] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toIsoDate(tomorrow);
  });

  const cidadeAtiva = cidadeSelecionada || cidades[0] || "";

  const handleDataInicioChange = (value: string) => {
    setDataInicio(value);
    const start = toLocalDate(value);
    const end = toLocalDate(dataFim);
    if (!start || !end) return;

    if (end <= start) {
      const nextDay = new Date(start);
      nextDay.setDate(nextDay.getDate() + 1);
      setDataFim(toIsoDate(nextDay));
    }
  };

  const handleDataFimChange = (value: string) => {
    const start = toLocalDate(dataInicio);
    const end = toLocalDate(value);
    if (!start || !end) {
      setDataFim(value);
      return;
    }

    if (end <= start) {
      const nextDay = new Date(start);
      nextDay.setDate(nextDay.getDate() + 1);
      setDataFim(toIsoDate(nextDay));
      return;
    }

    setDataFim(value);
  };

  const imoveisDaCidade = useMemo(
    () =>
      imoveis.filter(
        (item) =>
          !cidadeAtiva ||
          item.cidade.toLowerCase() === cidadeAtiva.toLowerCase(),
      ),
    [imoveis, cidadeAtiva],
  );

  const inicioSelecionado = toLocalDate(dataInicio);
  const fimSelecionado = toLocalDate(dataFim);

  const reservasPorImovel = useMemo(() => {
    const map = new Map<number, Reserva[]>();
    reservas.forEach((reserva) => {
      const current = map.get(reserva.idImovel) ?? [];
      current.push(reserva);
      map.set(reserva.idImovel, current);
    });
    return map;
  }, [reservas]);

  const isDisponivel = (idImovel: number) => {
    if (!inicioSelecionado || !fimSelecionado) return true;

    const reservasDoImovel = reservasPorImovel.get(idImovel) ?? [];

    return !reservasDoImovel.some((reserva) => {
      const inicioReserva = toLocalDate(reserva.dataInicio);
      const fimReserva = toLocalDate(reserva.dataFim);
      if (!inicioReserva || !fimReserva) return false;

      return inicioSelecionado < fimReserva && fimSelecionado > inicioReserva;
    });
  };

  const imoveisDisponiveis = imoveisDaCidade.filter((item) =>
    isDisponivel(item.idImovel),
  );

  const mediaDiariaRegiao =
    imoveisDisponiveis.length > 0
      ? imoveisDisponiveis.reduce((acc, item) => acc + item.valorDiaria, 0) /
        imoveisDisponiveis.length
      : 0;

  const cidadeMapa =
    cidadeAtiva || (imoveis.length > 0 ? imoveis[0].cidade : "Brasil");

  return (
    <section className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-700">
              Mapa por região
            </h3>
            <p className="text-xs text-stone-400">
              Selecione período e região para exibir apenas os imóveis
              disponíveis.
            </p>
          </div>
          <select
            value={cidadeAtiva}
            onChange={(e) => setCidadeSelecionada(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700"
            disabled={cidades.length === 0}
          >
            {cidades.length === 0 && <option value="">Sem cidades</option>}
            {cidades.map((cidade) => (
              <option key={cidade} value={cidade}>
                {cidade}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => handleDataInicioChange(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700"
          />
          <input
            type="date"
            value={dataFim}
            min={dataInicio}
            onChange={(e) => handleDataFimChange(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700"
          />
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider">
              Média da diária na região
            </p>
            <p className="text-sm font-semibold text-amber-700">
              R${" "}
              {mediaDiariaRegiao.toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 min-h-[320px] border-b lg:border-b-0 lg:border-r border-stone-100">
          <iframe
            title="Mapa da região"
            src={`https://www.google.com/maps?q=${encodeURIComponent(cidadeMapa)}&output=embed`}
            className="w-full h-full min-h-[320px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="lg:col-span-5 p-4 space-y-3">
          {imoveisDisponiveis.slice(0, 8).map((item) => (
            <div
              key={item.idImovel}
              className="border border-stone-100 rounded-xl p-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-stone-800">
                  {item.titulo}
                </p>
                <p className="text-xs text-stone-400">{item.cidade}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                  Disponível no período
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-stone-700">
                  R$ {item.valorDiaria.toLocaleString("pt-BR")}
                </p>
                <p className="text-[11px] text-stone-400">por noite</p>
              </div>
            </div>
          ))}

          {imoveisDisponiveis.length === 0 && (
            <p className="text-sm text-stone-400">
              Nenhum imóvel disponível nesta região para as datas selecionadas.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function DashboardPage() {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [imoveisData, reservasData] = await Promise.all([
          imoveisService.getAll(),
          reservaService.getAll(),
        ]);

        setImoveis(imoveisData.filter((item) => item.ativo));
        setReservas(reservasData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar dashboard");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <h1 className="text-xl font-semibold text-stone-800">
          Visão por região e disponibilidade
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          Selecione cidade e período para analisar disponibilidade e média da
          diária da região.
        </p>
      </div>

      <RegionMap imoveis={imoveis} reservas={reservas} />
    </div>
  );
}
