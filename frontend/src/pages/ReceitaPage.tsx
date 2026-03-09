import { useEffect, useMemo, useState } from "react";
import { ErrorMsg, Spinner } from "../components/common";
import {
  imoveisService,
  reservaService,
  type Imovel,
  type Reserva,
} from "../services/api";

type ReceitaPageProps = {
  hostId: number;
};

export function ReceitaPage({ hostId }: ReceitaPageProps) {
  const [meusImoveis, setMeusImoveis] = useState<Imovel[]>([]);
  const [reservasRecebidas, setReservasRecebidas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [imoveis, reservas] = await Promise.all([
          imoveisService.getByOwner(hostId),
          reservaService.getByAnfitriao(hostId),
        ]);
        setMeusImoveis(imoveis);
        setReservasRecebidas(reservas);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar receita");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [hostId]);

  const receitaPorImovel = useMemo(() => {
    const receita = new Map<number, number>();
    reservasRecebidas.forEach((reserva) => {
      receita.set(
        reserva.idImovel,
        (receita.get(reserva.idImovel) ?? 0) + reserva.valorTotal,
      );
    });

    return meusImoveis.map((imovel) => ({
      idImovel: imovel.idImovel,
      titulo: imovel.titulo,
      cidade: imovel.cidade,
      total: receita.get(imovel.idImovel) ?? 0,
    }));
  }, [meusImoveis, reservasRecebidas]);

  const receitaTotal = receitaPorImovel.reduce(
    (acc, item) => acc + item.total,
    0,
  );
  const totalReservas = reservasRecebidas.length;
  const ticketMedio = totalReservas > 0 ? receitaTotal / totalReservas : 0;
  const melhorImovel = [...receitaPorImovel].sort(
    (a, b) => b.total - a.total,
  )[0];

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Receita total
          </p>
          <p className="text-3xl font-bold text-stone-800 mt-1">
            R$ {receitaTotal.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-stone-400 mt-1">acumulado de reservas</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Reservas recebidas
          </p>
          <p className="text-3xl font-bold text-stone-800 mt-1">
            {totalReservas}
          </p>
          <p className="text-xs text-stone-400 mt-1">
            histórico no período atual
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Ticket médio
          </p>
          <p className="text-3xl font-bold text-stone-800 mt-1">
            R${" "}
            {ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-stone-400 mt-1">valor médio por reserva</p>
        </div>
      </div>

      {melhorImovel && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Melhor desempenho
          </p>
          <p className="text-sm text-amber-700 mt-1">
            {melhorImovel.titulo} ({melhorImovel.cidade}) gerou
            <span className="font-semibold">
              {" "}
              R$ {melhorImovel.total.toLocaleString("pt-BR")}
            </span>
            .
          </p>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-700">
            Receita por imóvel
          </h3>
          <span className="text-xs text-stone-400">
            {receitaPorImovel.length} imóvel(is)
          </span>
        </div>
        <div className="divide-y divide-stone-50">
          {receitaPorImovel.map((item) => (
            <div
              key={item.idImovel}
              className="px-5 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-stone-800">
                  {item.titulo}
                </p>
                <p className="text-xs text-stone-400">{item.cidade}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-stone-700">
                  R$ {item.total.toLocaleString("pt-BR")}
                </p>
                <p className="text-[11px] text-stone-400">receita acumulada</p>
              </div>
            </div>
          ))}
          {receitaPorImovel.length === 0 && (
            <p className="px-5 py-5 text-sm text-stone-400">
              Nenhum imóvel para consolidar receita.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
